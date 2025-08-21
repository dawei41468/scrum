import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getEpics } from '../api/epicsApi';
import { createStory, getStories, deleteStory, setStoryRank, bulkUpdateStory, getTasksByStory } from '../api/storiesApi';
import { getSubtasksByTask, moveTask } from '../api/tasksApi';
import { moveSubtask } from '../api/subtasksApi';
import { createComment, getCommentsForItem, deleteComment, updateComment } from '../api/commentApi';
import { createPlanningSession } from '../api/planningApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { hasRole, getUserId } from '../utils/auth';

const computeBetween = (prev, next) => {
  const p = typeof prev === 'number' ? prev : null;
  const n = typeof next === 'number' ? next : null;
  if (p != null && n != null) return (p + n) / 2;
  if (p == null && n != null) return n - 1;
  if (p != null && n == null) return p + 1;
  return 0;
};

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

const StoriesPage = () => {
  const navigate = useNavigate();
  const [epics, setEpics] = useState([]);
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [stories, setStories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newStory, setNewStory] = useState({ title: '', description: '', story_points: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'todo', story_points: 0, labels: '', assignee: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [savingEditId, setSavingEditId] = useState(null);
  // Comments state
  const [comments, setComments] = useState({}); // { [storyId]: Array<Comment> }
  const [commentsOpen, setCommentsOpen] = useState({}); // { [storyId]: boolean }
  const [loadingComments, setLoadingComments] = useState({}); // { [storyId]: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // { [storyId]: string }
  const [postingComment, setPostingComment] = useState({}); // { [storyId]: boolean }
  const { add: toast } = useToast();
  const canManage = hasRole('product_owner');
  const canModerateComments = hasRole('product_owner', 'scrum_master');
  const userId = getUserId();
  const [deletingComment, setDeletingComment] = useState({}); // { [commentId]: boolean }
  // Join Planning Session UI
  const [joinInput, setJoinInput] = useState('');

  // Tasks and Subtasks linkage UI state
  const [tasksByStory, setTasksByStory] = useState({}); // { [storyId]: Task[] }
  const [tasksOpen, setTasksOpen] = useState({}); // { [storyId]: boolean }
  const [loadingTasks, setLoadingTasks] = useState({}); // { [storyId]: boolean }
  const [subtasksByTask, setSubtasksByTask] = useState({}); // { [taskId]: Subtask[] }
  const [subtasksOpen, setSubtasksOpen] = useState({}); // { [taskId]: boolean }
  const [loadingSubtasks, setLoadingSubtasks] = useState({}); // { [taskId]: boolean }

  const [searchParams, setSearchParams] = useSearchParams();

  const filteredStories = useMemo(() => {
    const arr = (stories || []).filter(s => !selectedEpicId || s.epic_id === selectedEpicId);
    return arr.slice().sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [stories, selectedEpicId]);

  useEffect(() => {
    (async () => {
      try {
        const [epicsData, storiesData] = await Promise.all([getEpics(), getStories()]);
        setEpics(epicsData || []);
        setStories(storiesData || []);
        const qEpic = searchParams.get('epic');
        if (qEpic) {
          setSelectedEpicId(qEpic);
        } else if (!selectedEpicId && (epicsData || []).length > 0) {
          setSelectedEpicId(epicsData[0].id);
        }
      } catch (e) {
        toast({ variant: 'error', title: 'Failed to load stories' });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // mount only

  const refresh = async () => {
    try {
      const [epicsData, storiesData] = await Promise.all([getEpics(), getStories()]);
      setEpics(epicsData || []);
      setStories(storiesData || []);
      // Apply epic from query param if present
      const qEpic = searchParams.get('epic');
      if (qEpic) setSelectedEpicId(qEpic);
    } catch (e) {
      toast({ variant: 'error', title: 'Reload failed' });
    }
  };

  const handleJoinPlanning = (e) => {
    e?.preventDefault?.();
    const raw = (joinInput || '').trim();
    if (!raw) {
      toast({ variant: 'error', title: 'Enter a session ID or URL' });
      return;
    }
    let id = raw;
    // Allow pasting full URL
    try {
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const url = new URL(raw);
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[parts.length - 1] || '';
      }
    } catch (_) {
      // keep as is
    }
    id = String(id).trim();
    if (!id) {
      toast({ variant: 'error', title: 'Invalid session link' });
      return;
    }
    setJoinInput('');
    navigate(`/planning/${id}`);
  };

  const startPlanning = async (story) => {
    try {
      const data = await createPlanningSession({ story_id: story.id, scale: 'fibonacci' });
      const sessionId = data?.id || data?.session_id || data?.sessionId;
      if (sessionId) {
        navigate(`/planning/${sessionId}`);
      } else {
        throw new Error('No session id returned');
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to create planning session';
      toast({ variant: 'error', title: msg });
    }
  };

  const editComment = async (storyId, comment) => {
    const initial = comment.text || '';
    const nextText = window.prompt('Edit comment', initial);
    if (nextText == null) return; // canceled
    const trimmed = nextText.trim();
    if (!trimmed || trimmed === initial) return;
    // Optimistic update
    const prevList = comments[storyId] || [];
    const nextList = prevList.map(c => c.id === comment.id ? { ...c, text: trimmed } : c);
    setComments((prev) => ({ ...prev, [storyId]: nextList }));
    try {
      await updateComment(comment.id, trimmed);
      toast({ variant: 'success', title: 'Comment updated' });
    } catch (e) {
      // rollback
      setComments((prev) => ({ ...prev, [storyId]: prevList }));
      toast({ variant: 'error', title: 'Failed to update comment' });
    }
  };

  // Keep URL in sync when selected epic changes
  useEffect(() => {
    const current = searchParams.get('epic') || '';
    if ((selectedEpicId || '') !== current) {
      const next = new URLSearchParams(searchParams);
      if (selectedEpicId) next.set('epic', selectedEpicId);
      else next.delete('epic');
      setSearchParams(next, { replace: true });
    }
  }, [selectedEpicId]);

  // --- Comments helpers ---
  const loadComments = async (storyId) => {
    try {
      setLoadingComments((s) => ({ ...s, [storyId]: true }));
      const data = await getCommentsForItem(storyId);
      setComments((prev) => ({ ...prev, [storyId]: data || [] }));
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load comments' });
    } finally {
      setLoadingComments((s) => ({ ...s, [storyId]: false }));
    }
  };

  const toggleComments = async (storyId) => {
    setCommentsOpen((prev) => ({ ...prev, [storyId]: !prev[storyId] }));
    const willOpen = !commentsOpen[storyId];
    if (willOpen && !comments[storyId]) {
      await loadComments(storyId);
    }
  };

  const submitComment = async (storyId) => {
    const text = (commentInputs[storyId] || '').trim();
    if (!text) return;
    try {
      setPostingComment((s) => ({ ...s, [storyId]: true }));
      const created = await createComment({ text, item_id: storyId });
      setCommentInputs((s) => ({ ...s, [storyId]: '' }));
      // Optimistically append
      setComments((prev) => ({ ...prev, [storyId]: [...(prev[storyId] || []), created] }));
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to add comment' });
    } finally {
      setPostingComment((s) => ({ ...s, [storyId]: false }));
    }
  };

  const removeComment = async (storyId, commentId) => {
    // Optimistic: remove from UI first
    const prevList = comments[storyId] || [];
    const nextList = prevList.filter((c) => c.id !== commentId);
    setDeletingComment((m) => ({ ...m, [commentId]: true }));
    setComments((prev) => ({ ...prev, [storyId]: nextList }));
    try {
      await deleteComment(commentId);
      toast({ variant: 'success', title: 'Comment deleted' });
    } catch (e) {
      // Rollback
      setComments((prev) => ({ ...prev, [storyId]: prevList }));
      toast({ variant: 'error', title: 'Failed to delete comment' });
    } finally {
      setDeletingComment((m) => ({ ...m, [commentId]: false }));
    }
  };

  const handleCreate = async () => {
    if (!selectedEpicId) {
      toast({ variant: 'error', title: 'Select an epic first' });
      return;
    }
    if (!newStory.title || !newStory.title.trim()) {
      toast({ variant: 'error', title: 'Title is required' });
      return;
    }
    try {
      setIsCreating(true);
      await createStory({
        title: newStory.title,
        description: newStory.description,
        story_points: Number(newStory.story_points) || 0,
        epic_id: selectedEpicId,
      });
      setNewStory({ title: '', description: '', story_points: 0 });
      await refresh();
      toast({ variant: 'success', title: 'Story created' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to create story' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStory(id);
      await refresh();
      toast({ variant: 'success', title: 'Story deleted' });
    } catch (e) {
      // Show a clearer message when backend returns 409 due to existing tasks
      const status = e?.response?.status;
      if (status === 409) {
        toast({ variant: 'error', title: 'Cannot delete story with tasks. Move or delete tasks first.' });
      } else {
        toast({ variant: 'error', title: 'Failed to delete story' });
      }
    }
  };

  const startEdit = (story) => {
    setEditingId(story.id);
    setEditForm({
      title: story.title || '',
      description: story.description || '',
      status: story.status || 'todo',
      story_points: story.story_points || 0,
      labels: (story.labels || []).join(', '),
      assignee: story.assignee || '',
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    try {
      if (!editForm.title || !editForm.title.trim()) {
        toast({ variant: 'error', title: 'Title is required' });
        return;
      }
      setSavingEditId(id);
      const payload = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        story_points: Number(editForm.story_points) || 0,
        labels: editForm.labels ? editForm.labels.split(',').map(s => s.trim()).filter(Boolean) : [],
        assignee: editForm.assignee || null,
        epic_id: selectedEpicId,
      };
      await bulkUpdateStory(id, payload);
      setEditingId(null);
      await refresh();
      toast({ variant: 'success', title: 'Story updated' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to update story' });
    } finally {
      setSavingEditId(null);
    }
  };

  const onDragEnd = async (result) => {
    if (!canManage) return;
    if (!result.destination) return;

    const arr = filteredStories.slice();
    const [moved] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, moved);

    const idx = result.destination.index;
    const prev = idx > 0 ? arr[idx - 1].rank : null;
    const next = idx < arr.length - 1 ? arr[idx + 1].rank : null;
    const newRank = computeBetween(prev, next);

    try {
      const oldRank = moved.rank;
      // Optimistic update: set the moved story's rank locally
      setStories((prevStories) => prevStories.map(s => s.id === moved.id ? { ...s, rank: newRank } : s));
      await setStoryRank(moved.id, newRank);
      // Success: no full refresh needed
      toast({ variant: 'success', title: 'Story order updated' });
    } catch (e) {
      // Rollback on error
      setStories((prevStories) => prevStories.map(s => s.id === moved.id ? { ...s, rank: moved.rank } : s));
      toast({ variant: 'error', title: 'Failed to update order' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Stories</h2>
        <form onSubmit={handleJoinPlanning} className="flex items-center gap-2">
          <Input
            placeholder="Enter session ID or URL"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">Join session</Button>
        </form>
      </div>

      <Card header="Epic Filter">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select label="Epic" value={selectedEpicId} onChange={(e) => setSelectedEpicId(e.target.value)}>
            <option value="">All</option>
            {(epics || []).map(epic => (
              <option key={epic.id} value={epic.id}>{epic.title}</option>
            ))}
          </Select>
        </div>
      </Card>

      {canManage && (
        <Card header="Create Story">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Title"
              value={newStory.title}
              onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
            />
            <Input
              label="Description"
              value={newStory.description}
              onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
            />
            <Input
              label="Story Points"
              type="number"
              min={0}
              value={newStory.story_points}
              onChange={(e) => setNewStory({ ...newStory, story_points: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <Button onClick={handleCreate} disabled={!selectedEpicId || !newStory.title.trim() || isCreating}>
              {isCreating ? 'Adding...' : 'Add Story'}
            </Button>
          </div>
        </Card>
      )}

      <DragDropContext onDragStart={() => canManage && setIsDragging(true)} onDragEnd={async (result) => { if (canManage) setIsDragging(false); await onDragEnd(result); }}>
        <Droppable droppableId="stories">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {isLoading && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">Loading stories...</li>
              )}
              {filteredStories.length === 0 && !isLoading && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">No stories for the selected epic.</li>
              )}
              {filteredStories.map((story, index) => (
                <Draggable key={String(story.id)} draggableId={String(story.id)} index={index} isDragDisabled={!canManage}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <Card
                        header={(
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold">{story.title}</span>
                            </div>
                            {canManage && (
                              <div className="flex gap-2">
                                {editingId === story.id ? (
                                  <>
                                    <Button size="sm" variant="secondary" onClick={() => saveEdit(story.id)} disabled={savingEditId === story.id}>
                                      {savingEditId === story.id ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={savingEditId === story.id}>Cancel</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="secondary" onClick={() => startPlanning(story)} disabled={isDragging}>Plan</Button>
                                    <Button size="sm" variant="secondary" onClick={() => startEdit(story)} disabled={isDragging}>Edit</Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleDelete(story.id)} disabled={isDragging}>Delete</Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      >
                        {editingId === story.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} disabled={savingEditId === story.id} />
                            <Input label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} disabled={savingEditId === story.id} />
                            <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} disabled={savingEditId === story.id}>
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                            </Select>
                            <Input label="Story Points" type="number" min={0} value={editForm.story_points} onChange={(e) => setEditForm({ ...editForm, story_points: e.target.value })} disabled={savingEditId === story.id} />
                            <Input label="Labels (comma-separated)" value={editForm.labels} onChange={(e) => setEditForm({ ...editForm, labels: e.target.value })} disabled={savingEditId === story.id} />
                            <Input label="Assignee" value={editForm.assignee} onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })} disabled={savingEditId === story.id} />
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm text-gray-700">
                            <div>{story.description || <em>No description</em>}</div>
                            <div className="flex flex-wrap gap-1">
                              {(story.labels || []).map((l) => (
                                <span key={l} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{l}</span>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500">Status: {story.status || 'todo'} • Points: {story.story_points || 0}</div>

                            {/* Tasks for this Story */}
                            <div className="pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={async () => {
                                  setTasksOpen((prev) => ({ ...prev, [story.id]: !prev[story.id] }));
                                  const willOpen = !tasksOpen[story.id];
                                  if (willOpen && !tasksByStory[story.id]) {
                                    try {
                                      setLoadingTasks((s) => ({ ...s, [story.id]: true }));
                                      const tasks = await getTasksByStory(story.id);
                                      setTasksByStory((m) => ({ ...m, [story.id]: tasks || [] }));
                                    } catch (err) {
                                      toast({ variant: 'error', title: 'Failed to load tasks for story' });
                                    } finally {
                                      setLoadingTasks((s) => ({ ...s, [story.id]: false }));
                                    }
                                  }
                                }}
                              >
                                {tasksOpen[story.id] ? 'Hide tasks' : `Show tasks${tasksByStory[story.id] ? ` (${tasksByStory[story.id].length})` : ''}`}
                              </button>
                              {tasksOpen[story.id] && (
                                <div className="mt-2 space-y-2">
                                  {loadingTasks[story.id] ? (
                                    <div className="text-xs text-gray-500">Loading tasks...</div>
                                  ) : (
                                    <ul className="space-y-1">
                                      {(tasksByStory[story.id] || []).map((t) => (
                                        <li key={t.id} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">{t.title}</span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                className="text-[11px] text-blue-600 hover:underline"
                                                onClick={async () => {
                                                  const initial = t.story_id || '';
                                                  const input = window.prompt('Move task to story ID (leave blank to detach):', initial);
                                                  if (input == null) return;
                                                  const target = input.trim();
                                                  try {
                                                    setLoadingTasks((s) => ({ ...s, [story.id]: true }));
                                                    await moveTask(t.id, target ? target : null);
                                                    const tasks = await getTasksByStory(story.id);
                                                    setTasksByStory((m) => ({ ...m, [story.id]: tasks || [] }));
                                                    toast({ variant: 'success', title: 'Task moved' });
                                                  } catch (err) {
                                                    const status = err?.response?.status;
                                                    if (status === 400 || status === 404) {
                                                      toast({ variant: 'error', title: 'Invalid story ID' });
                                                    } else {
                                                      toast({ variant: 'error', title: 'Failed to move task' });
                                                    }
                                                  } finally {
                                                    setLoadingTasks((s) => ({ ...s, [story.id]: false }));
                                                  }
                                                }}
                                              >
                                                Move
                                              </button>
                                            </div>
                                          </div>
                                          {t.description && (
                                            <div className="text-[12px] text-gray-600 mt-0.5">{t.description}</div>
                                          )}
                                          {/* Subtasks toggle */}
                                          <div className="mt-1">
                                            <button
                                              type="button"
                                              className="text-[11px] text-blue-600 hover:underline"
                                              onClick={async () => {
                                                setSubtasksOpen((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
                                                const willOpenSub = !subtasksOpen[t.id];
                                                if (willOpenSub && !subtasksByTask[t.id]) {
                                                  try {
                                                    setLoadingSubtasks((s) => ({ ...s, [t.id]: true }));
                                                    const subs = await getSubtasksByTask(t.id);
                                                    setSubtasksByTask((m) => ({ ...m, [t.id]: subs || [] }));
                                                  } catch (err) {
                                                    toast({ variant: 'error', title: 'Failed to load subtasks' });
                                                  } finally {
                                                    setLoadingSubtasks((s) => ({ ...s, [t.id]: false }));
                                                  }
                                                }
                                              }}
                                            >
                                              {subtasksOpen[t.id] ? 'Hide subtasks' : `Show subtasks${subtasksByTask[t.id] ? ` (${subtasksByTask[t.id].length})` : ''}`}
                                            </button>
                                            {subtasksOpen[t.id] && (
                                              <div className="mt-1">
                                                {loadingSubtasks[t.id] ? (
                                                  <div className="text-[11px] text-gray-500">Loading subtasks...</div>
                                                ) : (
                                                  <ul className="mt-1 space-y-1">
                                                    {(subtasksByTask[t.id] || []).map((s) => (
                                                      <li key={s.id} className="rounded bg-white px-2 py-1 text-[11px] text-gray-700 border">
                                                        <div className="flex items-center justify-between">
                                                          <span className="font-medium text-gray-800">{s.title}</span>
                                                          <div className="flex items-center gap-2">
                                                            <button
                                                              type="button"
                                                              className="text-[11px] text-blue-600 hover:underline"
                                                              onClick={async () => {
                                                                const initial = t.id || '';
                                                                const input = window.prompt('Move subtask to parent task ID (leave blank to detach):', initial);
                                                                if (input == null) return;
                                                                const target = input.trim();
                                                                try {
                                                                  setLoadingSubtasks((x) => ({ ...x, [t.id]: true }));
                                                                  await moveSubtask(s.id, target ? target : null);
                                                                  const subs = await getSubtasksByTask(t.id);
                                                                  setSubtasksByTask((m) => ({ ...m, [t.id]: subs || [] }));
                                                                  toast({ variant: 'success', title: 'Subtask moved' });
                                                                } catch (err) {
                                                                  const status = err?.response?.status;
                                                                  if (status === 400 || status === 404) {
                                                                    toast({ variant: 'error', title: 'Invalid parent task ID' });
                                                                  } else {
                                                                    toast({ variant: 'error', title: 'Failed to move subtask' });
                                                                  }
                                                                } finally {
                                                                  setLoadingSubtasks((x) => ({ ...x, [t.id]: false }));
                                                                }
                                                              }}
                                                            >
                                                              Move
                                                            </button>
                                                          </div>
                                                        </div>
                                                        {s.description && (
                                                          <div className="text-[11px] text-gray-600 mt-0.5">{s.description}</div>
                                                        )}
                                                      </li>
                                                    ))}
                                                    {(!subtasksByTask[t.id] || subtasksByTask[t.id].length === 0) && (
                                                      <li className="text-[11px] text-gray-400">No subtasks.</li>
                                                    )}
                                                  </ul>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                      {(!tasksByStory[story.id] || tasksByStory[story.id].length === 0) && (
                                        <li className="text-xs text-gray-400">No tasks yet.</li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Comments */}
                            <div className="pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => toggleComments(story.id)}
                              >
                                {commentsOpen[story.id] ? 'Hide comments' : `Show comments${comments[story.id] ? ` (${comments[story.id].length})` : ''}`}
                              </button>
                              {commentsOpen[story.id] && (
                                <div className="mt-2 space-y-2">
                                  {loadingComments[story.id] ? (
                                    <div className="text-xs text-gray-500">Loading comments...</div>
                                  ) : (
                                    <ul className="space-y-1">
                                      {([...(comments[story.id] || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))).map((c) => (
                                        <li key={c.id} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">
                                              {userId && c.user_id === userId
                                                ? 'You'
                                                : (c.username || (c.user_id ? `User ${String(c.user_id).slice(-6)}` : 'Unknown'))}
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
                                                    onClick={() => editComment(story.id, c)}
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="text-[10px] text-red-600 hover:underline disabled:opacity-50"
                                                    onClick={() => removeComment(story.id, c.id)}
                                                    disabled={!!deletingComment[c.id]}
                                                  >
                                                    {deletingComment[c.id] ? 'Deleting...' : 'Delete'}
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <div>{c.text}</div>
                                        </li>
                                      ))}
                                      {(!comments[story.id] || comments[story.id].length === 0) && (
                                        <li className="text-xs text-gray-400">No comments yet.</li>
                                      )}
                                    </ul>
                                  )}
                                  {userId ? (
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Add a comment..."
                                        value={commentInputs[story.id] || ''}
                                        onChange={(e) => setCommentInputs((s) => ({ ...s, [story.id]: e.target.value }))}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => submitComment(story.id)}
                                        disabled={postingComment[story.id] || !(commentInputs[story.id] || '').trim()}
                                      >
                                        {postingComment[story.id] ? 'Posting...' : 'Post'}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500">Sign in to post a comment.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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

export default StoriesPage;
