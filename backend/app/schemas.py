from pydantic import BaseModel, Field
from .models import PyObjectId
from typing import List, Optional, Literal
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserResponse(BaseModel):
    id: PyObjectId
    username: str
    role: str

class BacklogItemCreate(BaseModel):
    title: str
    description: str
    priority: int
    story_points: int
    type: str | None = ""

class BacklogItemResponse(BaseModel):
    id: PyObjectId
    title: str
    description: str
    priority: int
    story_points: int
    type: str
    status: str

# --- Unified Items (PBI) Schemas ---
ItemType = Literal["story", "task", "bug", "spike"]

class SpikeFields(BaseModel):
    question: str
    approach: Optional[str] = None
    timebox_hours: int = Field(gt=0, default=1)
    exit_criteria: Optional[str] = None
    deliverable: Optional[str] = None

class ItemCreate(BaseModel):
    type: ItemType
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"
    labels: List[str] = []
    priority: Optional[int | str] = "medium"
    story_points: Optional[int] = None
    assignee: Optional[PyObjectId] = None
    rank: float = 0.0
    epic_id: Optional[PyObjectId] = None
    acceptance_criteria: List[str] = []
    spike: Optional[SpikeFields] = None

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    labels: Optional[List[str]] = None
    priority: Optional[int | str] = None
    story_points: Optional[int] = None
    assignee: Optional[PyObjectId] = None
    rank: Optional[float] = None
    epic_id: Optional[PyObjectId] = None
    acceptance_criteria: Optional[List[str]] = None
    spike: Optional[SpikeFields] = None

class ItemResponse(BaseModel):
    id: PyObjectId
    type: str
    title: str
    description: Optional[str]
    status: str
    labels: List[str]
    priority: Optional[int | str]
    story_points: Optional[int]
    assignee: Optional[PyObjectId]
    rank: float
    epic_id: Optional[PyObjectId]
    acceptance_criteria: List[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class SprintCreate(BaseModel):
    goal: str
    duration: int
    backlog_items: List[PyObjectId] = []

class SprintResponse(BaseModel):
    id: PyObjectId
    goal: str
    duration: int
    backlog_items: List[PyObjectId]

class CommentCreate(BaseModel):
    text: str
    item_id: PyObjectId

class CommentResponse(BaseModel):
    id: PyObjectId
    text: str
    user_id: PyObjectId
    username: Optional[str] = None
    item_id: PyObjectId
    created_at: datetime

class CommentUpdate(BaseModel):
    text: str

# Planning Poker schemas
class PlanningSessionCreate(BaseModel):
    story_id: str
    scale: str = "fibonacci"  # fibonacci, modified_fibonacci, t_shirt

class PlanningSessionResponse(BaseModel):
    id: str
    story_id: str
    created_by: str
    status: str
    scale: str
    created_at: datetime
    vote_count: int = 0
    votes_revealed: bool = False

class VoteCreate(BaseModel):
    value: str

class VoteResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    username: Optional[str] = None
    value: str
    created_at: datetime

class SessionRevealResponse(BaseModel):
    session_id: str
    votes: List[VoteResponse]
    average: Optional[float] = None
    median: Optional[str] = None

class EstimateUpdate(BaseModel):
    final_estimate: str

# --- Hierarchy Schemas ---
class EpicCreate(BaseModel):
    title: str
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None

class EpicResponse(BaseModel):
    id: PyObjectId
    title: str
    description: str
    labels: List[str]
    assignee: Optional[PyObjectId]
    story_points: int
    status: str
    rank: float

class StoryCreate(BaseModel):
    title: str
    epic_id: Optional[PyObjectId] = None
    description: str = ""
    acceptance_criteria: List[str] = []
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0
    sprint_id: Optional[PyObjectId] = None
    cross_sprint: bool = False

class StoryResponse(BaseModel):
    id: PyObjectId
    epic_id: Optional[PyObjectId]
    title: str
    description: str
    acceptance_criteria: List[str]
    labels: List[str]
    assignee: Optional[PyObjectId]
    story_points: int
    status: str
    sprint_id: Optional[PyObjectId]
    cross_sprint: bool
    rank: float

class TaskCreate(BaseModel):
    title: str
    story_id: Optional[PyObjectId] = None
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0
    sprint_id: Optional[PyObjectId] = None

class TaskResponse(BaseModel):
    id: PyObjectId
    story_id: Optional[PyObjectId]
    title: str
    description: str
    labels: List[str]
    assignee: Optional[PyObjectId]
    story_points: int
    status: str
    sprint_id: Optional[PyObjectId]
    rank: float

class SubtaskCreate(BaseModel):
    title: str
    parent_task_id: Optional[PyObjectId] = None
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0

class SubtaskResponse(BaseModel):
    id: PyObjectId
    parent_task_id: Optional[PyObjectId]
    title: str
    description: str
    labels: List[str]
    assignee: Optional[PyObjectId]
    story_points: int
    status: str
    rank: float