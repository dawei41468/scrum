# Scrum App

A lightweight, intuitive tool for Scrum teams to manage workflows, built with React, FastAPI, and MongoDB.

## Overview

This app supports key Scrum elements: roles (Product Owner, Scrum Master, Developers), events (Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective), artifacts (Product Backlog, Sprint Backlog, Increment), and commitments (Product Goal, Sprint Goal, Definition of Done).

## Tech Stack

- **Frontend**: React (with hooks, React Router, Axios)
- **Backend**: FastAPI (RESTful APIs), Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Deployment**: Tencent Cloud Lighthouse, Docker, Docker Compose
- **Authentication**: JWT

## Project Structure

```
scrum-app/
├── backend/                  # FastAPI backend
│   ├── app/                  # Main app code
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app entry
│   │   ├── database.py       # MongoDB connection
│   │   ├── models.py         # Pydantic models for DB schemas
│   │   ├── schemas.py        # API request/response schemas
│   │   ├── crud.py           # CRUD operations
│   │   ├── routers/          # API routes (e.g., backlog.py, sprint.py, user.py)
│   │   ├── utils/            # Helpers (e.g., auth.py for JWT)
│   │   └── tests/            # Pytest files
│   ├── requirements.txt      # Dependencies
│   ├── Dockerfile            # For containerization
│   └── .env                  # Environment variables (e.g., MONGO_URI)
├── frontend/                 # React frontend
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── assets/           # Images, fonts (local only)
│   │   ├── components/       # Reusable UI (e.g., TaskCard.js, Board.js)
│   │   ├── pages/            # Routed pages (e.g., BacklogPage.js, SprintPage.js)
│   │   ├── api/              # API clients (e.g., backlogApi.js)
│   │   ├── utils/            # Helpers (e.g., auth.js)
│   │   ├── App.js            # Main app component
│   │   ├── index.js          # Entry point
│   │   └── tests/            # Jest tests
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Optional for separate container
│   └── .env                  # React env vars (e.g., API_URL)
├── docker-compose.yml        # For local dev and deployment
├── .gitignore                # Ignore node_modules, build, etc.
├── README.md                 # Project docs
└── deploy.sh                 # Script for Tencent Cloud deployment
```

## MVP Features

1. **User Management**: Basic registration/login with roles (Product Owner, Scrum Master, Developer). Use JWT for auth.
2. **Product Backlog Management**: CRUD backlog items (title, description, priority, story points). Drag-and-drop prioritization.
3. **Sprint Management**: Create Sprints with goals and durations; pull items from Product Backlog to Sprint Backlog.
4. **Task Board**: Kanban-style board for Sprint Backlog (columns: To Do, In Progress, Done). Drag-and-drop tasks, assign users.
5. **Basic Collaboration**: Real-time updates (via polling), comments on items.
6. **Reporting**: Simple burndown chart for Sprint progress.
7. **UI/UX**: Responsive design for web/mobile; intuitive navigation.

## Setup and Run Locally

1. **Install Dependencies**:
   - Backend: `cd backend && pip install -r requirements.txt`
   - Frontend: `cd frontend && npm install`
   - UI Icons: `npm install lucide-react` (in `frontend/`)

2. **Environment Variables**:
   - Backend: Set `MONGO_URI` in `backend/.env` (see `backend/.env.example`).
   - Frontend: Set `REACT_APP_API_URL` in `frontend/.env` (see `frontend/.env.example`).
     - Example: `REACT_APP_API_URL=http://localhost:8000`

3. **Run Locally (without Docker)**:
   - Backend: `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
   - Frontend: `cd frontend && npm start`

4. **Run with Docker** (recommended):
   - Ensure Docker and Docker Compose are installed.
   - From project root: `docker-compose up --build`

5. **Access**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`

## Authentication & Routing

- **JWT Interceptor** (`frontend/src/api/http.js`):
  - Automatically attaches `Authorization: Bearer <token>` from `localStorage` to every request.
  - On `401 Unauthorized`, it clears the token and redirects to `/login`.

- **Protected Routes** (`frontend/src/components/ProtectedRoute.jsx` and `frontend/src/App.js`):
  - The root `Layout` and its children (`BacklogPage`, `SprintPage`, `BoardPage`) are wrapped in `ProtectedRoute`.
  - Unauthenticated users are redirected to `/login`.

- **Login/Token Storage**:
  - Successful login stores `token` in `localStorage`.
  - Subsequent API calls use the interceptor; no manual header setup needed.

## Role-Based Access Control (RBAC)

The backend enforces RBAC and the frontend gates controls for better UX. JWT includes the user's `role`.

- **Backlog**
  - Create, Delete, Update (non-status fields): product_owner
  - Update status (e.g., board column move): developer, scrum_master, product_owner
  - Read: any authenticated user

- **Sprints**
  - Create, Update, Delete: scrum_master, product_owner
  - Add/Remove sprint items: scrum_master, product_owner
  - Read (list, detail, burndown): any authenticated user

Notes:
- Frontend reads the role from the JWT stored in `localStorage` and shows/hides action controls accordingly.
- Backend remains the source of truth and returns 403 for insufficient permissions.

## UI Icons

- Bottom navigation uses `lucide-react` icons.
- If icons don’t render, make sure `lucide-react` is installed in `frontend/` and restart the dev server.

## Deployment

Refer to `deploy.sh` for instructions on deploying to Tencent Cloud Lighthouse.

## Development Approach

Follow an agile methodology, prioritizing an MVP first. After MVP validation, implement remaining features iteratively.