from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import user, backlog, sprint, comment, planning, epics, stories, tasks, subtasks, audits
from .database import init_db, close_db
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(backlog.router)
app.include_router(sprint.router)
app.include_router(comment.router)
app.include_router(planning.router)
app.include_router(epics.router)
app.include_router(stories.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
app.include_router(audits.router)