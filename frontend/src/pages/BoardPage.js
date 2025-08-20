import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSprint } from '../api/sprintApi';
import { getBacklogItem, updateBacklogItem } from '../api/backlogApi';
import Card from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';

const BoardPage = () => {
  const { sprintId } = useParams();
  const [columns, setColumns] = useState({
    todo: [],
    in_progress: [],
    done: []
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();

  // Initial fetch on mount or sprint change
  useEffect(() => {
    fetchBoard();
  }, [sprintId]);

  // Polling fetch, paused during drag
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        fetchBoard();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isDragging, sprintId]);

  const fetchBoard = async () => {
    try {
      setIsLoading(true);
      const sprint = await getSprint(sprintId);
      if (sprint && Array.isArray(sprint.backlog_items)) {
        const items = await Promise.all(sprint.backlog_items.map(id => getBacklogItem(id)));
        const newColumns = { todo: [], in_progress: [], done: [] };
        items.forEach(item => {
          if (item && item.status && newColumns[item.status]) {
            newColumns[item.status].push(item);
          }
        });
        setColumns(newColumns);
      } else {
        setColumns({ todo: [], in_progress: [], done: [] });
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load board' });
    } finally {
      setIsLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const [movedItem] = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, movedItem);

    setColumns({ ...columns });

    try {
      await updateBacklogItem(movedItem.id, { status: destination.droppableId });
      toast({ variant: 'success', title: 'Item moved' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to move item' });
      // Reload to restore state
      fetchBoard();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Task Board</h2>
      {isLoading && (
        <div className="rounded border border-dashed border-gray-300 bg-white/40 p-3 text-sm text-gray-500">Loading board...</div>
      )}
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={async (result) => {
          // End dragging state immediately to avoid unmounts during async
          setIsDragging(false);
          await onDragEnd(result);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(columns).map(([colId, colItems]) => (
            <div key={colId} className="min-h-[200px]">
              <Card
                header={(
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      {colId.replace('_', ' ')}
                    </h3>
                    <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-700">
                      {colItems.length}
                    </span>
                  </div>
                )}
              >
                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={[
                        'min-h-[160px] space-y-2 rounded-md p-2 transition-colors',
                        snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-transparent'
                      ].join(' ')}
                    >
                      {colItems.length === 0 && (
                        <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
                          No items in this column
                        </li>
                      )}
                      {colItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                          {(provided, snap) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={[
                                'rounded-md border border-gray-200 bg-white p-3 text-sm shadow-sm transition-transform',
                                snap.isDragging ? 'rotate-[0.5deg] shadow-md ring-2 ring-blue-200' : ''
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-medium text-gray-900">
                                  {item.title}
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{item.story_points || 0} pts</span>
                                </span>
                                {/* Placeholder for future quick actions */}
                                <div className="flex items-center gap-2">
                                  {/* Example: <Button size="sm" variant="ghost">Edit</Button> */}
                                </div>
                              </div>
                              {item.description && (
                                <p className="mt-1 text-gray-600">{item.description}</p>
                              )}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default BoardPage;