import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SprintPage from '../pages/SprintPage';
import { getSprints, createSprint } from '../api/sprintApi';
import { getBacklogItems } from '../api/backlogApi';

// Mock the API calls
jest.mock('../api/sprintApi', () => ({
  getSprints: jest.fn(() => Promise.resolve([])),
  createSprint: jest.fn(() => Promise.resolve({ id: '1', goal: 'Test Sprint', duration: 14, backlog_items: [] })),
  deleteSprint: jest.fn(() => Promise.resolve())
}));
jest.mock('../api/backlogApi', () => ({
  getBacklogItems: jest.fn(() => Promise.resolve([]))
}));

test('renders sprint page', async () => {
  await act(async () => {
    render(<SprintPage />);
  });
  await screen.findByRole('heading', { name: /Sprints/i });
  expect(screen.getByRole('heading', { name: /Sprints/i })).toBeInTheDocument();
});

test('can add a new sprint', async () => {
  await act(async () => {
    render(<SprintPage />);
  });
  
  fireEvent.change(screen.getByPlaceholderText('Sprint Goal'), { target: { value: 'New Sprint' } });
  fireEvent.change(screen.getByPlaceholderText('Duration (days)'), { target: { value: '14' } });
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Create Sprint/i }));
  });
  
  expect(createSprint).toHaveBeenCalledWith({
    goal: 'New Sprint',
    duration: 14,
    backlog_items: []
  });
});