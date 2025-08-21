from pydantic import BaseModel
from .models import PyObjectId
from typing import List, Optional
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

class BacklogItemResponse(BaseModel):
    id: PyObjectId
    title: str
    description: str
    priority: int
    story_points: int
    status: str

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