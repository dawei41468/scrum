import React, { useEffect, useState } from 'react';
import { getSprints, createSprint, deleteSprint, getBurndown, addItemToSprint, removeItemFromSprint } from '../api/sprintApi';
import { getBacklogItems } from '../api/backlogApi';
import { Link } from 'react-router-dom';

const SprintPage = () => {
  const [sprints, setSprints] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [newSprint, setNewSprint] = useState({ goal: '', duration: 0, backlog_items: [] });
  const [burndown, setBurndown] = useState({}); // { [sprintId]: { total, remaining, completed } }
  const [addSelections, setAddSelections] = useState({}); // { [sprintId]: itemId }

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
  };

  const fetchBacklog = async () => {
    const data = await getBacklogItems();
    setBacklogItems(data || []);
  };

  const handleCreate = async () => {
    await createSprint(newSprint);
    setNewSprint({ goal: '', duration: 0, backlog_items: [] });
    fetchSprints();
  };

  const handleDelete = async (id) => {
    await deleteSprint(id);
    fetchSprints();
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
    await addItemToSprint(sprintId, itemId);
    setAddSelections(prev => ({ ...prev, [sprintId]: '' }));
    await fetchSprints();
  };

  const handleRemoveFromSprint = async (sprintId, itemId) => {
    await removeItemFromSprint(sprintId, itemId);
    await fetchSprints();
  };

  const itemTitle = (id) => (backlogItems.find(b => b.id === id)?.title || id);

  return (
    <div>
      <h2>Sprints</h2>
      <div>
        <input
          value={newSprint.goal}
          onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
          placeholder="Sprint Goal"
        />
        <input
          type="number"
          value={newSprint.duration}
          onChange={(e) => setNewSprint({ ...newSprint, duration: parseInt(e.target.value) })}
          placeholder="Duration (days)"
        />
        <h3>Select Backlog Items</h3>
        <ul>
          {backlogItems.map(item => (
            <li key={item.id}>
              <input
                type="checkbox"
                checked={newSprint.backlog_items.includes(item.id)}
                onChange={() => toggleItemSelection(item.id)}
              />
              {item.title}
            </li>
          ))}
        </ul>
        <button onClick={handleCreate}>Create Sprint</button>
      </div>
      <ul>
        {sprints.map(sprint => {
          const inSprint = new Set(sprint.backlog_items || []);
          const available = backlogItems.filter(b => !inSprint.has(b.id));
          return (
            <li key={sprint.id}>
              {sprint.goal} - {sprint.duration} days
              <Link to={`/board/${sprint.id}`} style={{ marginLeft: 8 }}>Open Board</Link>
              {burndown[sprint.id] && (
                <div>
                  <small>
                    Total: {burndown[sprint.id].total} | Remaining: {burndown[sprint.id].remaining} | Completed: {burndown[sprint.id].completed}
                  </small>
                </div>
              )}
              {/* Minimal burndown bar */}
              {burndown[sprint.id] && (
                <div style={{ display: 'flex', width: 200, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden', margin: '4px 0' }}>
                  <div style={{ width: `${Math.min(100, (burndown[sprint.id].completed / Math.max(1, burndown[sprint.id].total)) * 100)}%`, background: '#22c55e' }} />
                  <div style={{ width: `${Math.min(100, (burndown[sprint.id].remaining / Math.max(1, burndown[sprint.id].total)) * 100)}%`, background: '#ef4444' }} />
                </div>
              )}
              {/* Items in sprint with remove */}
              <div>
                <strong>Items:</strong>
                <ul>
                  {(sprint.backlog_items || []).map(id => (
                    <li key={id}>
                      {itemTitle(id)}
                      <button style={{ marginLeft: 8 }} onClick={() => handleRemoveFromSprint(sprint.id, id)}>Remove</button>
                    </li>
                  ))}
                  {(!sprint.backlog_items || sprint.backlog_items.length === 0) && <li><em>No items</em></li>}
                </ul>
              </div>
              {/* Add item to sprint */}
              <div>
                <select
                  value={addSelections[sprint.id] || ''}
                  onChange={(e) => handleSelectItemToAdd(sprint.id, e.target.value)}
                >
                  <option value="">Select item to add</option>
                  {available.map(item => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                <button onClick={() => handleAddToSprint(sprint.id)} disabled={!addSelections[sprint.id]}>Add</button>
              </div>
              <button onClick={() => handleDelete(sprint.id)}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SprintPage;