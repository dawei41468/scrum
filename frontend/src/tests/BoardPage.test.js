import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import BoardPage from '../pages/BoardPage';
import { getSprint } from '../api/sprintApi';
import { getBacklogItem } from '../api/backlogApi';

// Mock the API calls
jest.mock('../api/sprintApi', () => ({
  getSprint: jest.fn(() => Promise.resolve({ id: '1', goal: 'Test Sprint', duration: 14, backlog_items: ['1', '2'] }))
}));
jest.mock('../api/backlogApi', () => ({
  getBacklogItem: jest.fn(id => Promise.resolve({ id, title: `Item ${id}`, story_points: 3, priority: 1, description: 'Test Desc', status: id === '1' ? 'todo' : 'in_progress' })),
  updateBacklogItem: jest.fn(() => Promise.resolve())
}));

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ sprintId: '1' })
}));

test('renders board page', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <BoardPage />
      </BrowserRouter>
    );
  });
  await screen.findByRole('heading', { name: /Task Board/i });
  expect(screen.getByRole('heading', { name: /Task Board/i })).toBeInTheDocument();
});

test('displays columns for todo, in progress, and done', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <BoardPage />
      </BrowserRouter>
    );
  });
  await screen.findByText(/TODO/i);
  expect(screen.getByText(/TODO/i)).toBeInTheDocument();
  expect(screen.getByText(/IN_PROGRESS/i)).toBeInTheDocument();
  expect(screen.getByText(/DONE/i)).toBeInTheDocument();
});