import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BacklogPage from './pages/BacklogPage';
import EpicsPage from './pages/EpicsPage';
import StoriesPage from './pages/StoriesPage';
import SprintPage from './pages/SprintPage';
import BoardPage from './pages/BoardPage';
import PlanningSessionPage from './pages/PlanningSessionPage';
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
      { path: 'epics', element: <EpicsPage /> },
      { path: 'stories', element: <StoriesPage /> },
      { path: 'sprints', element: <SprintPage /> },
      { path: 'board/:sprintId', element: <BoardPage /> },
      { path: 'planning/:sessionId', element: <PlanningSessionPage /> },
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