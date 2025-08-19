# Scrum App Project Overview

## Introduction
This document outlines the complete scope for developing a Scrum app designed to assist Scrum teams in managing their workflows. The app adheres to the Scrum framework as defined in the Scrum Guide, supporting key elements such as roles (Product Owner, Scrum Master, Developers), events (Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective), artifacts (Product Backlog, Sprint Backlog, Increment), and commitments (Product Goal, Sprint Goal, Definition of Done).

The app will be built using a modern tech stack: React for the frontend, FastAPI for the backend, and MongoDB for the database. It will be deployed on Tencent Cloud Lighthouse in China, ensuring compliance with China-friendly solutions (e.g., no Google services, using local mirrors for dependencies).

**Development Approach**: Follow an agile methodology (ironically fitting for a Scrum app). Prioritize building and testing a Minimum Viable Product (MVP) first. The MVP will include core features for basic usability. Only after the MVP is coded, tested, and validated should the remaining features be implemented iteratively.

**Project Goals**:
- Provide a lightweight, intuitive tool for Scrum teams.
- Ensure transparency, collaboration, and empirical process control.
- Support small teams (free tier) to enterprises (premium features).
- Maintain scalability, security, and performance.

**Assumptions**:
- Development team has experience with React, Python/FastAPI, MongoDB, and Docker.
- Target users are Scrum teams in China or globally, with mobile/web access.
- No external integrations in MVP; add later.

## Tech Stack
- **Frontend**: React (with hooks, React Router for navigation, Axios for API calls). Use Create React App or Vite for setup.
- **Backend**: FastAPI (for RESTful APIs), Pydantic for data validation, Motor for async MongoDB interactions.
- **Database**: MongoDB (self-hosted on Lighthouse or managed via TencentDB for MongoDB).
- **Deployment**: Tencent Cloud Lighthouse (Ubuntu-based instance).
- **Other Tools**:
  - Authentication: JWT (implement in backend).
  - Testing: Jest for frontend, Pytest for backend, PyTest-Mongo for DB mocks.
  - CI/CD: Optional GitHub Actions or Tencent Cloud pipelines (post-MVP).
  - China-Friendly: Use Aliyun PyPI mirror, Taobao npm registry; avoid CDNs like Google Fonts—use local assets or system fonts.
- **Stack Rationale**: FARM stack (FastAPI + React + MongoDB) is efficient, scalable, and aligns with async operations for real-time features.

## Project Structure
Organize the project in a monorepo for simplicity:
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

## Scope of the Entire Project
The full project includes all features from the initial brainstorm and requirements. Divide into phases: MVP (core functionality), Phase 2 (enhancements), Phase 3 (advanced/polish).

### MVP Scope (Build and Test First)
Focus on essential features for a basic Scrum workflow. Implement, test, and deploy this before proceeding.

**MVP Features**:
1. **User Management**: Basic registration/login with roles (Product Owner, Scrum Master, Developer). Use JWT for auth.
2. **Product Backlog Management**: Create, read, update, delete (CRUD) backlog items (title, description, priority, story points). Drag-and-drop prioritization.
3. **Sprint Management**: Create Sprints with goals and durations; pull items from Product Backlog to Sprint Backlog.
4. **Task Board**: Kanban-style board for Sprint Backlog (columns: To Do, In Progress, Done). Drag-and-drop tasks, assign users.
5. **Basic Collaboration**: Real-time updates (via WebSockets or polling), comments on items.
6. **Reporting**: Simple burndown chart for Sprint progress.
7. **UI/UX**: Responsive design for web/mobile; intuitive navigation.

**Non-Functional for MVP**:
- Performance: Handle 10-20 users/team.
- Security: Basic auth, HTTPS.
- Usability: Tooltips for Scrum guidance.

**Instructions to Code the MVP**:
1. **Setup Environment**:
   - Clone repo and create structure as above.
   - Backend: Install deps with `pip install -r requirements.txt` using Aliyun mirror.
   - Frontend: `npm install` using Taobao registry.
   - Database: Set up local MongoDB or TencentDB; update MONGO_URI in .env.

2. **Backend Coding**:
   - Implement `database.py` with Motor client.
   - Define models/schemas for User, BacklogItem, Sprint.
   - Create routers: `/users` (register/login), `/backlogs` (CRUD), `/sprints` (CRUD, link to backlogs).
   - Add JWT auth middleware.
   - Use CRUD functions for DB operations (e.g., `await db.backlogs.insert_one(item.dict(exclude_unset=True))`).

3. **Frontend Coding**:
   - Set up routes with React Router: /login, /backlog, /sprints, /board.
   - Components: LoginForm, BacklogList (with drag-and-drop via react-beautiful-dnd), SprintForm, KanbanBoard.
   - API calls: Use Axios in api.js (e.g., `axios.post('/api/backlogs', item, { headers: { Authorization: `Bearer ${token}` } })`).
   - State management: Use React Context or Redux for auth/user data.

4. **Integration**:
   - Serve frontend build from backend: In `main.py`, mount StaticFiles at "/".
   - Run backend with `uvicorn` and frontend with `npm start` for local development.

**Instructions to Test the MVP**:
1. **Unit Tests**:
   - Backend: Use Pytest – test CRUD endpoints (e.g., `def test_create_backlog(client): response = client.post('/api/backlogs', json={...}); assert response.status_code == 200`).
   - Frontend: Jest – test components (e.g., `render(<Backlog />); expect(screen.getByText('Product Backlog')).toBeInTheDocument()`).

2. **Integration Tests**:
   - End-to-end: Use tools like Cypress for frontend-backend flows (e.g., create user, add backlog item, start Sprint).
   - DB: Mock with pytest-mongo.

3. **Manual Testing**:
   - Scenarios: Register user, create backlog, prioritize items, create Sprint, move tasks on board, view burndown.
   - Edge Cases: Invalid inputs, unauthorized access, concurrent updates.
   - Performance: Load test with Locust (backend) for 10 users.

4. **Validation**:
   - Run on local, then deploy to a test Lighthouse instance.
   - Get feedback: Simulate a Scrum team using it for a mock Sprint.
   - Fix bugs before proceeding to full scope.

**MVP Timeline Estimate**: 2-4 weeks (assuming 1-2 developers).

### Full Project Scope (Build After MVP)
Expand iteratively in Sprints, using the app itself for project management!

**Phase 2: Core Enhancements**:
- **Event Support**: Dedicated tools for Sprint Planning (timers, estimation), Daily Scrum (logs/reminders), Sprint Review (feedback polls), Retrospective (templates/voting).
- **Advanced Collaboration**: In-app chat, mentions, notifications (email/push via Tencent services).
- **Reporting**: Velocity charts, custom dashboards, exports (CSV/PDF).
- **Customization**: Flexible fields, themes, multi-project support.

**Phase 3: Advanced Features and Polish**:
- **Integrations**: GitHub/Slack hooks (China-friendly alternatives like Gitee/WeChat).
- **AI Assistance**: Basic suggestions (e.g., effort estimation using simple ML via scikit-learn, but no external APIs).
- **Impediment Tracking**: Dedicated board for blockers.
- **Offline Mode**: Service workers for PWA (Progressive Web App).
- **Security/Compliance**: Audit logs, GDPR features.
- **Scalability**: Optimize for 100+ users; add caching (Redis).

**Full Non-Functional**:
- Usability: WCAG accessibility, multilingual (English/Chinese).
- Performance: <2s load times, WebSockets for real-time.
- Reliability: 99.9% uptime, backups.
- Maintainability: Code linting (ESLint, Black), docs with Swagger (FastAPI built-in).

**Full Testing**:
- Expand MVP tests to cover new features.
- Security: OWASP scans, penetration testing.
- Load Testing: Simulate large teams.
- User Acceptance: Beta testing with real Scrum teams.

## Deployment Instructions
1. **Local Dev**: Run backend with `uvicorn main:app --reload` in the backend directory and frontend with `npm start` in the frontend directory.
2. **Tencent Cloud**:
   - Create Lighthouse instance (Ubuntu, 2-core/4GB min).
   - SSH in, install Node.js, Python, and Git.
   - Clone repo, install dependencies for backend (`pip install -r requirements.txt`) and frontend (`npm install`).
   - Update .env with production vars (e.g., MONGO_URI from TencentDB).
   - Start backend with `uvicorn main:app --host 0.0.0.0 --port 8000` and frontend with `npm start` or use a process manager like PM2.
   - Configure firewall (ports 80/443), domain, SSL via Tencent.
3. **Monitoring**: Use Tencent Cloud monitoring; add logging with ELK if needed post-MVP.

## Risks and Mitigations
- China Compliance: Test for blocks; use mirrors.
- Scope Creep: Stick to MVP first.
- Dependencies: Version pin in requirements/package.json.
- Budget: Start free; scale with paid Tencent services.

## Next Steps
1. Set up repo and environments.
2. Code and test MVP.
3. Deploy MVP to Lighthouse.
4. Iterate on full features based on feedback.

This plan ensures a solid, phased rollout. Refer to code examples from previous overviews for starters.