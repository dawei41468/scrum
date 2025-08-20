import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import BoardPage from './pages/BoardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <BacklogPage /> },
      { path: 'backlog', element: <BacklogPage /> },
      { path: 'sprints', element: <SprintPage /> },
      { path: 'board/:sprintId', element: <BoardPage /> },
    ]
  }
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