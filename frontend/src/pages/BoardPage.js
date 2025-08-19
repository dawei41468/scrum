import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSprint } from '../api/sprintApi';
import { getBacklogItem, updateBacklogItem } from '../api/backlogApi';

const BoardPage = () => {
  const { sprintId } = useParams();
  const [columns, setColumns] = useState({
    todo: [],
    in_progress: [],
    done: []
  });
  const [isDragging, setIsDragging] = useState(false);

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

    await updateBacklogItem(movedItem.id, { status: destination.droppableId });
  };

  return (
    <div>
      <h2>Task Board</h2>
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={async (result) => {
          // End dragging state immediately to avoid unmounts during async
          setIsDragging(false);
          await onDragEnd(result);
        }}
      >
        {Object.entries(columns).map(([colId, colItems]) => (
          <div key={colId}>
            <h3>{colId.toUpperCase()}</h3>
            <Droppable droppableId={colId}>
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef}>
                  {colItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                      {(provided) => (
                        <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          {item.title}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

export default BoardPage;