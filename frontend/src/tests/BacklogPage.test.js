import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BacklogPage from '../pages/BacklogPage';
import { getBacklogItems, createBacklogItem } from '../api/backlogApi';

// Mock the API calls
jest.mock('../api/backlogApi', () => ({
  getBacklogItems: jest.fn(() => Promise.resolve([])),
  createBacklogItem: jest.fn(() => Promise.resolve({ id: '1', title: 'Test Item', story_points: 3, priority: 1, description: 'Test Desc', status: 'todo' })),
  updateBacklogItem: jest.fn(() => Promise.resolve()),
  deleteBacklogItem: jest.fn(() => Promise.resolve())
}));
jest.mock('../api/commentApi', () => ({
  createComment: jest.fn(() => Promise.resolve()),
  getCommentsForItem: jest.fn(() => Promise.resolve([]))
}));

test('renders backlog page', async () => {
  await act(async () => {
    render(<BacklogPage />);
  });
  await screen.findByRole('heading', { name: /Product Backlog/i });
  expect(screen.getByRole('heading', { name: /Product Backlog/i })).toBeInTheDocument();
});

test('can add a new backlog item', async () => {
  await act(async () => {
    render(<BacklogPage />);
  });
  
  fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New Task' } });
  fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'New Desc' } });
  fireEvent.change(screen.getByPlaceholderText('Story Points'), { target: { value: '5' } });
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
  });
  
  expect(createBacklogItem).toHaveBeenCalledWith({
    title: 'New Task',
    description: 'New Desc',
    priority: 0,
    story_points: 5
  });
  await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async operation
});