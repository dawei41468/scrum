import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getBacklogItems, createBacklogItem, updateBacklogItem, deleteBacklogItem } from '../api/backlogApi';
import { createComment, getCommentsForItem } from '../api/commentApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { hasRole } from '../utils/auth';

const BacklogPage = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', priority: 0, story_points: 0 });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();
  const canManageBacklog = hasRole('product_owner');

  // Initial fetch on mount only
  useEffect(() => {
    fetchItems();
  }, []);

  // Polling fetch, paused during drag
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        fetchItems();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isDragging]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await getBacklogItems();
      const sortedData = data ? data.sort((a, b) => (a.priority || 0) - (b.priority || 0)) : [];
      setItems(sortedData);
      if (data) {
        data.forEach(item => fetchComments(item.id));
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load backlog' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (itemId) => {
    const data = await getCommentsForItem(itemId);
    setComments(prev => ({ ...prev, [itemId]: data }));
  };

  const handleCreate = async () => {
    try {
      await createBacklogItem(newItem);
      setNewItem({ title: '', description: '', priority: 0, story_points: 0 });
      await fetchItems();
      toast({ variant: 'success', title: 'Backlog item created' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to create item' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBacklogItem(id);
      await fetchItems();
      toast({ variant: 'success', title: 'Item deleted' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to delete item' });
    }
  };

  const onDragEnd = async (result) => {
    if (!canManageBacklog) return; // extra guard
    if (!result.destination) return;
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    // Update priorities
    const updatedItems = reorderedItems.map((item, index) => ({ ...item, priority: index + 1 }));
    setItems(updatedItems);

    // Update backend
    try {
      for (const item of updatedItems) {
        await updateBacklogItem(item.id, { priority: item.priority });
      }
      toast({ variant: 'success', title: 'Backlog order updated' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to update order' });
      // Re-fetch to restore known state
      fetchItems();
    }
  };

  const handleAddComment = async (itemId) => {
    await createComment({ text: newComment[itemId], item_id: itemId });
    setNewComment(prev => ({ ...prev, [itemId]: '' }));
    fetchComments(itemId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Product Backlog</h2>

      {/* Create item */}
      {canManageBacklog && (
      <Card header="Create Backlog Item">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Title"
            placeholder="Title"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          />
          <Input
            label="Story Points"
            type="number"
            min={0}
            value={newItem.story_points}
            onChange={(e) => setNewItem({ ...newItem, story_points: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="mt-4">
          <Button onClick={handleCreate}>Add Item</Button>
        </div>
      </Card>
      )}

      <DragDropContext
        onDragStart={() => canManageBacklog && setIsDragging(true)}
        onDragEnd={async (result) => {
          // End dragging state immediately to avoid unmounts
          if (canManageBacklog) setIsDragging(false);
          await onDragEnd(result);
        }}
      >
        <Droppable droppableId="backlog">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {isLoading && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
                  Loading backlog...
                </li>
              )}
              {items.length === 0 && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
                  No backlog items yet. Add your first item above.
                </li>
              )}
              {items.map((item, index) => (
                <Draggable key={String(item.id)} draggableId={String(item.id)} index={index} isDragDisabled={!canManageBacklog}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <Card
                        header={(
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold">{item.title}</span>
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{item.story_points || 0} pts</span>
                            </div>
                            {canManageBacklog && (
                              <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>Delete</Button>
                            )}
                          </div>
                        )}
                      >
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">{item.description || <em>No description</em>}</div>

                          <div>
                            <h4 className="text-sm font-medium">Comments</h4>
                            <ul className="mt-1 space-y-1">
                              {(comments[item.id] || []).map(comment => (
                                <li key={comment.id} className="text-sm text-gray-800">{comment.text}</li>
                              ))}
                            </ul>
                            <div className="mt-2 flex gap-2">
                              <Input
                                className="flex-1"
                                placeholder="Add comment"
                                value={newComment[item.id] || ''}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [item.id]: e.target.value }))}
                              />
                              <Button onClick={() => handleAddComment(item.id)}>Add</Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default BacklogPage;