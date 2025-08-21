import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getBacklogItems, createBacklogItem, updateBacklogItem, deleteBacklogItem } from '../api/backlogApi';
import { createComment, getCommentsForItem, deleteComment, updateComment } from '../api/commentApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { hasRole, getUserId } from '../utils/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPlanningSession } from '../api/planningApi';
import { listAudits } from '../api/auditsApi';

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
  const [newItem, setNewItem] = useState({ title: '', description: '', priority: 0, story_points: 0, type: '' });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();
  const canManageBacklog = hasRole('product_owner');
  const canModerateComments = hasRole('product_owner', 'scrum_master');
  const userId = getUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedTypes = ['story', 'bug', 'task', 'spike'];
  const qpType = (searchParams.get('type') || '').toLowerCase();
  const [typeFilter, setTypeFilter] = useState(allowedTypes.includes(qpType) ? qpType : '');
  const navigate = useNavigate();
  const [activityOpen, setActivityOpen] = useState({}); // { [itemId]: boolean }
  const [auditsByItem, setAuditsByItem] = useState({}); // { [itemId]: any[] }
  const [loadingAudits, setLoadingAudits] = useState({}); // { [itemId]: boolean }

  // When a specific type filter is active, pre-select it in the create form (only if type is empty)
  useEffect(() => {
    if (typeFilter) {
      setNewItem((prev) => prev.type ? prev : { ...prev, type: typeFilter });
    }
  }, [typeFilter]);

  // Simple client-side validation for create form
  const titleOk = (newItem.title || '').trim().length > 0;
  const pointsOk = Number(newItem.story_points) > 0;
  const typeOk = allowedTypes.includes((newItem.type || '').toLowerCase());
  const canSubmit = titleOk && pointsOk && typeOk;

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
      // Normalize type to lowercase to make filter robust across backend variations
      const normalized = sortedData.map(it => ({
        ...it,
        type: (it.type || '').toLowerCase()
      }));
      setItems(normalized);
      if (data) {
        data.forEach(item => fetchComments(item.id));
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load backlog' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudits = async (item) => {
    try {
      const itemId = item.id;
      setLoadingAudits((m) => ({ ...m, [itemId]: true }));
      // Backend supports 'story' (and 'epic'); scope audits to stories for now
      const data = await listAudits({ entity: 'story', entity_id: String(itemId) });
      setAuditsByItem((m) => ({ ...m, [itemId]: data || [] }));
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load activity' });
    } finally {
      setLoadingAudits((m) => ({ ...m, [item.id]: false }));
    }
  };

  const fetchComments = async (itemId) => {
    const data = await getCommentsForItem(itemId);
    setComments(prev => ({ ...prev, [itemId]: data }));
  };

  const handleCreate = async () => {
    try {
      const payload = { ...newItem };
      if (!payload.type) delete payload.type;
      const created = await createBacklogItem(payload);
      // Optimistically inject created item and ensure type is present locally
      setItems((prev) => [{ ...created, type: (payload.type || created.type || '').toLowerCase() }, ...prev]);
      setNewItem({ title: '', description: '', priority: 0, story_points: 0, type: '' });
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

  const startPlanning = async (item) => {
    try {
      const data = await createPlanningSession({ story_id: item.id, scale: 'fibonacci' });
      const sessionId = data?.id || data?.session_id || data?.sessionId;
      if (sessionId) navigate(`/planning/${sessionId}`);
      else throw new Error('No session id returned');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to create planning session';
      toast({ variant: 'error', title: msg });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Product Backlog</h2>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Type:</span>
          <div className="flex flex-wrap gap-2">
            {['', ...allowedTypes].map((t) => {
              const isAll = t === '';
              const label = isAll ? 'All' : t.charAt(0).toUpperCase() + t.slice(1);
              const active = (typeFilter || '') === t;
              return (
                <button
                  key={t || 'all'}
                  type="button"
                  className={[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs border',
                    active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  ].join(' ')}
                  onClick={() => {
                    const next = t;
                    setTypeFilter(next);
                    const sp = new URLSearchParams(searchParams);
                    if (next) sp.set('type', next); else sp.delete('type');
                    setSearchParams(sp, { replace: true });
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Create item */}
      {canManageBacklog && (
      <Card header="Create Backlog Item">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-700">Type</label>
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
            >
              <option value="">Select type</option>
              {allowedTypes.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Simple validation and helper messages */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCreate} disabled={!canSubmit}>Add Item</Button>
          </div>
        </div>
      </Card>
      )}

  <DragDropContext
    onDragStart={() => canManageBacklog && setIsDragging(true)}
    onDragEnd={async (result) => {
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
          {(items.filter((it) => {
            if (!typeFilter) return true;
            const t = (it.type || '').toLowerCase();
            return t === typeFilter;
          })).map((item, index) => (
            <Draggable key={String(item.id)} draggableId={String(item.id)} index={index} isDragDisabled={!canManageBacklog}>
              {(provided) => (
                <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                  <Card
                    header={(
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm md:text-base break-words flex-1 pr-2">{item.title}</span>
                          {canManageBacklog && (
                            <div className="flex items-center gap-2 shrink-0">
                              {String(item.type || '').toLowerCase() === 'story' && (
                                <Button size="sm" variant="secondary" onClick={() => startPlanning(item)} disabled={isDragging}>Plan</Button>
                              )}
                              <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>Delete</Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">{item.story_points || 0} pts</span>
                          {canManageBacklog ? (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Type:</span>
                              <select
                                className="rounded border border-gray-300 bg-white px-1 py-0.5"
                                value={(item.type || '').toLowerCase()}
                                onChange={async (e) => {
                                  const next = e.target.value;
                                  const prev = item.type || '';
                                  // optimistic update
                                  setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, type: next } : it));
                                  try {
                                    await updateBacklogItem(item.id, { type: next });
                                    toast({ variant: 'success', title: 'Type updated' });
                                  } catch {
                                    // revert on failure
                                    setItems((arr) => arr.map((it) => it.id === item.id ? { ...it, type: prev } : it));
                                    toast({ variant: 'error', title: 'Failed to update type' });
                                  }
                                }}
                              >
                                {allowedTypes.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 border border-gray-200">
                              {(item.type ? String(item.type) : '—')}
                            </span>
                          )}
                        </div>
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

                          {(
                            <div className="pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={async () => {
                                  setActivityOpen((m) => ({ ...m, [item.id]: !m[item.id] }));
                                  const willOpen = !activityOpen[item.id];
                                  if (willOpen && !auditsByItem[item.id]) {
                                    await loadAudits(item);
                                  }
                                }}
                              >
                                {activityOpen[item.id] ? 'Hide activity' : `Show activity${auditsByItem[item.id] ? ` (${auditsByItem[item.id].length})` : ''}`}
                              </button>
                              {activityOpen[item.id] && (
                                <div className="mt-2">
                                  {loadingAudits[item.id] ? (
                                    <div className="text-xs text-gray-500">Loading activity...</div>
                                  ) : (
                                    <ul className="space-y-1">
                                      {(auditsByItem[item.id] || []).map((a, idx) => (
                                        <li key={a.id || idx} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">{a.action || a.event || 'Change'}</span>
                                            {a.created_at && (
                                              <span className="text-[10px] text-gray-400">{formatDateTime(a.created_at)}</span>
                                            )}
                                          </div>
                                          {a.details && (
                                            <div className="text-[11px] text-gray-600 mt-0.5">{typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}</div>
                                          )}
                                        </li>
                                      ))}
                                      {(!auditsByItem[item.id] || auditsByItem[item.id].length === 0) && (
                                        <li className="text-xs text-gray-400">No activity.</li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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