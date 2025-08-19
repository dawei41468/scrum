import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getBacklogItems, createBacklogItem, updateBacklogItem, deleteBacklogItem } from '../api/backlogApi';
import { createComment, getCommentsForItem } from '../api/commentApi';

const BacklogPage = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', priority: 0, story_points: 0 });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [isDragging, setIsDragging] = useState(false);

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
    const data = await getBacklogItems();
    const sortedData = data ? data.sort((a, b) => (a.priority || 0) - (b.priority || 0)) : [];
    setItems(sortedData);
    if (data) {
      data.forEach(item => fetchComments(item.id));
    }
  };

  const fetchComments = async (itemId) => {
    const data = await getCommentsForItem(itemId);
    setComments(prev => ({ ...prev, [itemId]: data }));
  };

  const handleCreate = async () => {
    await createBacklogItem(newItem);
    setNewItem({ title: '', description: '', priority: 0, story_points: 0 });
    fetchItems();
  };

  const handleDelete = async (id) => {
    await deleteBacklogItem(id);
    fetchItems();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    // Update priorities
    const updatedItems = reorderedItems.map((item, index) => ({ ...item, priority: index + 1 }));
    setItems(updatedItems);

    // Update backend
    for (const item of updatedItems) {
      await updateBacklogItem(item.id, { priority: item.priority });
    }
  };

  const handleAddComment = async (itemId) => {
    await createComment({ text: newComment[itemId], item_id: itemId });
    setNewComment(prev => ({ ...prev, [itemId]: '' }));
    fetchComments(itemId);
  };

  return (
    <div>
      <h2>Product Backlog</h2>
      <div>
        <input
          value={newItem.title}
          onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
          placeholder="Title"
        />
        <input
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          placeholder="Description"
        />
        <input
          type="number"
          value={newItem.story_points}
          onChange={(e) => setNewItem({ ...newItem, story_points: parseInt(e.target.value) || 0 })}
          placeholder="Story Points"
        />
        <button onClick={handleCreate}>Add Item</button>
      </div>
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={async (result) => {
          // End dragging state immediately to avoid unmounts
          setIsDragging(false);
          await onDragEnd(result);
        }}
      >
        <Droppable droppableId="backlog">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef}>
              {items.map((item, index) => (
                <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      {item.title} - {item.story_points} pts
                      <button onClick={() => handleDelete(item.id)}>Delete</button>
                      <div>
                        <h4>Comments</h4>
                        <ul>
                          {(comments[item.id] || []).map(comment => (
                            <li key={comment.id}>{comment.text}</li>
                          ))}
                        </ul>
                        <input
                          value={newComment[item.id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Add comment"
                        />
                        <button onClick={() => handleAddComment(item.id)}>Add</button>
                      </div>
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