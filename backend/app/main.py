from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import user, sprint, comment, planning, epics, subtasks, audits, items
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
    # Allow common local dev origins across ports (React/Vite/etc.)
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^http:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(sprint.router)
app.include_router(comment.router)
app.include_router(planning.router)
app.include_router(epics.router)
app.include_router(items.router)
app.include_router(subtasks.router)
app.include_router(audits.router)