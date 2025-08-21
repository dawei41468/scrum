import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getBacklogItems, createBacklogItem, updateBacklogItem, deleteBacklogItem } from '../api/backlogApi';
import { createComment, getCommentsForItem, deleteComment, updateComment } from '../api/commentApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { hasRole, getUserId } from '../utils/auth';

// Lightweight date formatter for comment timestamps
const formatDateTime = (value) => {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
};

const BacklogPage = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', priority: 0, story_points: 0 });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();
  const canManageBacklog = hasRole('product_owner');
  const canModerateComments = hasRole('product_owner', 'scrum_master');
  const userId = getUserId();

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

  const handleDeleteComment = async (itemId, commentId) => {
    try {
      await deleteComment(commentId);
      toast({ variant: 'success', title: 'Comment deleted' });
      await fetchComments(itemId);
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to delete comment' });
    }
  };

  const handleEditComment = async (itemId, comment) => {
    const initial = comment.text || '';
    const nextText = window.prompt('Edit comment', initial);
    if (nextText == null) return; // cancelled
    const trimmed = nextText.trim();
    if (!trimmed || trimmed === initial) return;
    try {
      await updateComment(comment.id, trimmed);
      toast({ variant: 'success', title: 'Comment updated' });
      await fetchComments(itemId);
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to update comment' });
    }
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
                              {([...(comments[item.id] || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))).map((c) => (
                                <li key={c.id} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">
                                      {userId && c.user_id === userId ? 'You' : (c.username || (c.user_id ? `User ${String(c.user_id).slice(-6)}` : 'Unknown'))}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {c.created_at && (
                                        <span className="text-[10px] text-gray-400">{formatDateTime(c.created_at)}</span>
                                      )}
                                      {(userId && (c.user_id === userId || canModerateComments)) && (
                                        <>
                                          <button
                                            type="button"
                                            className="text-[10px] text-blue-600 hover:underline"
                                            onClick={() => handleEditComment(item.id, c)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="text-[10px] text-red-600 hover:underline"
                                            onClick={() => handleDeleteComment(item.id, c.id)}
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div>{c.text}</div>
                                </li>
                              ))}
                              {(!comments[item.id] || comments[item.id].length === 0) && (
                                <li className="text-xs text-gray-400">No comments yet.</li>
                              )}
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