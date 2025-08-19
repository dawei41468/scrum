import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import BoardPage from './pages/BoardPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/backlog', element: <BacklogPage /> },
  { path: '/sprints', element: <SprintPage /> },
  { path: '/board/:sprintId', element: <BoardPage /> },
  { path: '/', element: <BacklogPage /> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;