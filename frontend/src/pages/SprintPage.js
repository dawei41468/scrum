import React, { useEffect, useState } from 'react';
import { getSprints, createSprint, deleteSprint, getBurndown, addItemToSprint, removeItemFromSprint } from '../api/sprintApi';
import { getBacklogItems } from '../api/backlogApi';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { hasRole } from '../utils/auth';

const SprintPage = () => {
  const [sprints, setSprints] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [newSprint, setNewSprint] = useState({ goal: '', duration: 0, backlog_items: [] });
  const [burndown, setBurndown] = useState({}); // { [sprintId]: { total, remaining, completed } }
  const [addSelections, setAddSelections] = useState({}); // { [sprintId]: itemId }
  const [isLoading, setIsLoading] = useState(true);
  const { add: toast } = useToast();
  const canManageSprints = hasRole('scrum_master', 'product_owner');

  useEffect(() => {
    fetchSprints();
    fetchBacklog();
    const interval = setInterval(() => {
      fetchSprints();
      fetchBacklog();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSprints = async () => {
    try {
      setIsLoading(true);
      const data = await getSprints();
      setSprints(data || []);
      if (data && Array.isArray(data)) {
        // fetch burndown for each sprint in parallel
        const entries = await Promise.all(
          data.map(async (s) => {
            try {
              const bd = await getBurndown(s.id);
              return [s.id, bd];
            } catch {
              return [s.id, null];
            }
          })
        );
        const map = Object.fromEntries(entries);
        setBurndown(map);
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load sprints' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBacklog = async () => {
    try {
      const data = await getBacklogItems();
      setBacklogItems(data || []);
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to load backlog' });
    }
  };

  const handleCreate = async () => {
    if (!canManageSprints) return;
    try {
      await createSprint(newSprint);
      setNewSprint({ goal: '', duration: 0, backlog_items: [] });
      await fetchSprints();
      toast({ variant: 'success', title: 'Sprint created' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to create sprint' });
    }
  };

  const handleDelete = async (id) => {
    if (!canManageSprints) return;
    try {
      await deleteSprint(id);
      await fetchSprints();
      toast({ variant: 'success', title: 'Sprint deleted' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to delete sprint' });
    }
  };

  const toggleItemSelection = (itemId) => {
    setNewSprint(prev => {
      const items = prev.backlog_items.includes(itemId)
        ? prev.backlog_items.filter(i => i !== itemId)
        : [...prev.backlog_items, itemId];
      return { ...prev, backlog_items: items };
    });
  };

  const handleSelectItemToAdd = (sprintId, itemId) => {
    setAddSelections(prev => ({ ...prev, [sprintId]: itemId }));
  };

  const handleAddToSprint = async (sprintId) => {
    const itemId = addSelections[sprintId];
    if (!itemId) return;
    if (!canManageSprints) return;
    try {
      await addItemToSprint(sprintId, itemId);
      setAddSelections(prev => ({ ...prev, [sprintId]: '' }));
      await fetchSprints();
      toast({ variant: 'success', title: 'Item added to sprint' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to add item' });
    }
  };

  const handleRemoveFromSprint = async (sprintId, itemId) => {
    if (!canManageSprints) return;
    try {
      await removeItemFromSprint(sprintId, itemId);
      await fetchSprints();
      toast({ variant: 'success', title: 'Item removed from sprint' });
    } catch (e) {
      toast({ variant: 'error', title: 'Failed to remove item' });
    }
  };

  const itemTitle = (id) => (backlogItems.find(b => b.id === id)?.title || id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Sprints</h2>

      {/* Create sprint */}
      {canManageSprints && (
      <Card header="Create Sprint">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Goal"
            placeholder="Sprint goal"
            value={newSprint.goal}
            onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
          />
          <Input
            label="Duration (days)"
            type="number"
            min={0}
            value={newSprint.duration}
            onChange={(e) => setNewSprint({ ...newSprint, duration: parseInt(e.target.value || '0') })}
          />
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Backlog Items</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {backlogItems.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  id={`new-${item.id}`}
                  type="checkbox"
                  className="h-4 w-4"
                  checked={newSprint.backlog_items.includes(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                />
                <label htmlFor={`new-${item.id}`} className="text-sm">{item.title}</label>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <Button onClick={handleCreate}>Create Sprint</Button>
        </div>
      </Card>
      )}

      {/* Sprint list */}
      <ul className="space-y-4">
        {isLoading && (
          <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
            Loading sprints...
          </li>
        )}
        {sprints.length === 0 && (
          <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-6 text-sm text-gray-500">
            No sprints yet. Create your first sprint above.
          </li>
        )}
        {sprints.map(sprint => {
          const inSprint = new Set(sprint.backlog_items || []);
          const available = backlogItems.filter(b => !inSprint.has(b.id));
          return (
            <li key={sprint.id}>
              <Card
                header={(
                  <div className="flex items-center justify-between">
                    <div className="text-sm"><span className="font-semibold">{sprint.goal}</span> · {sprint.duration} days</div>
                    <div className="flex items-center gap-2">
                      <Link className="text-blue-600 text-sm hover:underline" to={`/board/${sprint.id}`}>Open Board</Link>
                      {canManageSprints && (
                        <Button variant="secondary" size="sm" onClick={() => handleDelete(sprint.id)}>Delete</Button>
                      )}
                    </div>
                  </div>
                )}
              >
                {burndown[sprint.id] && (
                  <div className="mb-2">
                    <small className="text-gray-600">
                      Total: {burndown[sprint.id].total} | Remaining: {burndown[sprint.id].remaining} | Completed: {burndown[sprint.id].completed}
                    </small>
                    <div className="mt-1 flex w-64 h-2 bg-gray-200 rounded overflow-hidden">
                      <div className="bg-green-500" style={{ width: `${Math.min(100, (burndown[sprint.id].completed / Math.max(1, burndown[sprint.id].total)) * 100)}%` }} />
                      <div className="bg-red-500" style={{ width: `${Math.min(100, (burndown[sprint.id].remaining / Math.max(1, burndown[sprint.id].total)) * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <strong className="text-sm">Items:</strong>
                  <ul className="mt-1 space-y-1">
                    {(sprint.backlog_items || []).map(id => (
                      <li key={id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {itemTitle(id)}
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{(backlogItems.find(b => b.id === id)?.story_points) || 0} pts</span>
                        </span>
                        {canManageSprints && (
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveFromSprint(sprint.id, id)}>Remove</Button>
                        )}
                      </li>
                    ))}
                    {(!sprint.backlog_items || sprint.backlog_items.length === 0) && (
                      <li className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-white/40 p-4 text-sm text-gray-500">
                        No items in this sprint
                      </li>
                    )}
                  </ul>
                </div>

                {canManageSprints && (
                  <div className="mt-3 flex items-end gap-2">
                    <div className="flex-1 max-w-xs">
                      <Select
                        value={addSelections[sprint.id] || ''}
                        onChange={(e) => handleSelectItemToAdd(sprint.id, e.target.value)}
                        label="Add item"
                      >
                        <option value="">Select item to add</option>
                        {available.map(item => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </Select>
                    </div>
                    <Button onClick={() => handleAddToSprint(sprint.id)} disabled={!addSelections[sprint.id]}>Add</Button>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SprintPage;