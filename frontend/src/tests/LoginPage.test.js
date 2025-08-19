import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { login, register } from '../api/userApi';

// Mock the API calls
jest.mock('../api/userApi', () => ({
  login: jest.fn(() => Promise.resolve({ access_token: 'mock_token' })),
  register: jest.fn(() => Promise.resolve({ id: '1', username: 'testuser', role: 'developer' }))
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

test('renders login page', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  });
  await screen.findByRole('heading', { name: /Login/i });
  expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
});

test('can switch between login and register', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  });

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Switch to Register/i }));
  });
  await screen.findByRole('heading', { name: /Register/i });
  expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Switch to Login/i }));
  });
  await screen.findByRole('heading', { name: /Login/i });
  expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
});

test('can submit login form', async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  });
  
  fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'testpass' } });
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
  });
  
  expect(login).toHaveBeenCalledWith({ username: 'testuser', password: 'testpass' });
  await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async operation
  expect(mockNavigate).toHaveBeenCalledWith('/backlog');
});