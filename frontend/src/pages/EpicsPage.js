import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createEpic, getEpics, deleteEpic, setEpicRank, bulkUpdateEpic } from '../api/epicsApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { hasRole } from '../utils/auth';

const computeBetween = (prev, next) => {
  const p = typeof prev === 'number' ? prev : null;
  const n = typeof next === 'number' ? next : null;
  if (p != null && n != null) return (p + n) / 2;
  if (p == null && n != null) return n - 1;
  if (p != null && n == null) return p + 1;
  return 0;
};

const EpicsPage = () => {
  const [epics, setEpics] = useState([]);
  const [newEpic, setNewEpic] = useState({ title: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'todo', story_points: 0, labels: '' });
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();
  const canManage = hasRole('product_owner');

  useEffect(() => {
    fetchEpics();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (!isDragging) fetchEpics();
    }, 10000);
    return () => clearInterval(t);
  }, [isDragging]);

  const fetchEpics = async () => {
    try {
      setIsLoading(true);
      const data = await getEpics();
      const sorted = (data || []).slice().sort((a, b) => (a.rank || 0) - (b.rank || 0));
      setEpics(sorted);
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load epics' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createEpic(newEpic);
      setNewEpic({ title: '', description: '' });
      await fetchEpics();
      toast({ variant: 'success', title: 'Epic created' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to create epic' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEpic(id);
      await fetchEpics();
      toast({ variant: 'success', title: 'Epic deleted' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to delete epic' });
    }
  };

  const startEdit = (epic) => {
    setEditingId(epic.id);
    setEditForm({
      title: epic.title || '',
      description: epic.description || '',
      status: epic.status || 'todo',
      story_points: epic.story_points || 0,
      labels: (epic.labels || []).join(', '),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        story_points: Number(editForm.story_points) || 0,
        labels: editForm.labels
          ? editForm.labels.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      await bulkUpdateEpic(id, payload);
      setEditingId(null);
      await fetchEpics();
      toast({ variant: 'success', title: 'Epic updated' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to update epic' });
    }
  };

  const onDragEnd = async (result) => {
    if (!canManage) return;
    if (!result.destination) return;

    const reordered = Array.from(epics);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Compute new rank for moved item only
    const idx = result.destination.index;
    const prev = idx > 0 ? reordered[idx - 1].rank : null;
    const next = idx < reordered.length - 1 ? reordered[idx + 1].rank : null;
    const newRank = computeBetween(prev, next);

    setEpics(reordered.map((e, i) => (e.id === moved.id ? { ...e, rank: newRank } : e)));

    try {
      await setEpicRank(moved.id, newRank);
      toast({ variant: 'success', title: 'Epic order updated' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to update order' });
      fetchEpics();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Epics</h2>

      {canManage && (
        <Card header="Create Epic">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Title"
              placeholder="Title"
              value={newEpic.title}
              onChange={(e) => setNewEpic({ ...newEpic, title: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="Description"
              value={newEpic.description}
              onChange={(e) => setNewEpic({ ...newEpic, description: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreate}>Add Epic</Button>
          </div>
        </Card>
      )}

      <DragDropContext
        onDragStart={() => canManage && setIsDragging(true)}
        onDragEnd={async (result) => {
          if (canManage) setIsDragging(false);
          await onDragEnd(result);
        }}
      >
        <Droppable droppableId="epics">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {isLoading && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
                  Loading epics...
                </li>
              )}
              {epics.length === 0 && !isLoading && (
                <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
                  No epics yet. Add your first epic above.
                </li>
              )}
              {epics.map((epic, index) => (
                <Draggable key={String(epic.id)} draggableId={String(epic.id)} index={index} isDragDisabled={!canManage}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <Card
                        header={(
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-semibold">{epic.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Link className="text-blue-600 text-sm hover:underline" to={`/stories?epic=${epic.id}`}>View stories</Link>
                              {canManage && (
                                <div className="flex gap-2">
                                  {editingId === epic.id ? (
                                    <>
                                      <Button size="sm" variant="secondary" onClick={() => saveEdit(epic.id)}>Save</Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="secondary" onClick={() => startEdit(epic)}>Edit</Button>
                                      <Button size="sm" variant="secondary" onClick={() => handleDelete(epic.id)}>Delete</Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      >
                        {editingId === epic.id ? (
                          <div className="space-y-3">
                            <Input
                              label="Title"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                            <Input
                              label="Description"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                            <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                            </Select>
                            <Input
                              label="Story Points"
                              type="number"
                              min={0}
                              value={editForm.story_points}
                              onChange={(e) => setEditForm({ ...editForm, story_points: e.target.value })}
                            />
                            <Input
                              label="Labels (comma-separated)"
                              value={editForm.labels}
                              onChange={(e) => setEditForm({ ...editForm, labels: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm text-gray-700">
                            <div>{epic.description || <em>No description</em>}</div>
                            <div className="flex flex-wrap gap-1">
                              {(epic.labels || []).map((l) => (
                                <span key={l} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{l}</span>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500">Status: {epic.status || 'todo'} • Points: {epic.story_points || 0}</div>
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

export default EpicsPage;
