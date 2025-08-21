from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId
from pydantic.functional_validators import BeforeValidator
from typing_extensions import Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v))]

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    username: str
    password: str  # Hashed
    role: str  # 'product_owner', 'scrum_master', 'developer'

class BacklogItem(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: str = ""
    # Unified PBI fields
    type: str = ""  # story | task | bug | spike
    status: str = "todo"  # todo, in_progress, done
    labels: List[str] = []
    # Accept both legacy int and new string priorities
    priority: int | str | None = "medium"
    story_points: Optional[int] = None
    assignee: Optional[PyObjectId] = None
    rank: float = 0.0
    epic_id: Optional[PyObjectId] = None
    acceptance_criteria: List[str] = []
    # Timestamps (optional to maintain backward-compat with existing data)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Sprint(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    goal: str
    duration: int  # in days
    backlog_items: List[PyObjectId] = []

class Comment(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    text: str
    user_id: PyObjectId
    username: Optional[str] = None
    item_id: PyObjectId
    created_at: datetime

# --- Hierarchy models ---
class Epic(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0  # roll-up or target
    status: str = "todo"  # todo, in_progress, done
    rank: float = 0.0

class Story(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    epic_id: Optional[PyObjectId] = None
    title: str
    description: str = ""
    acceptance_criteria: List[str] = []
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0
    status: str = "todo"
    sprint_id: Optional[PyObjectId] = None
    cross_sprint: bool = False
    rank: float = 0.0

class Task(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    story_id: Optional[PyObjectId] = None
    title: str
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0
    status: str = "todo"
    sprint_id: Optional[PyObjectId] = None
    rank: float = 0.0

class Subtask(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    parent_task_id: Optional[PyObjectId] = None
    title: str
    description: str = ""
    labels: List[str] = []
    assignee: Optional[PyObjectId] = None
    story_points: int = 0
    status: str = "todo"
    rank: float = 0.0

# --- Audit model ---
class AuditEvent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    entity: str  # e.g., 'epic', 'story', 'task', 'subtask'
    entity_id: PyObjectId
    action: str  # e.g., 'reorder', 'create', 'update', 'delete'
    changes: dict = {}
    created_at: datetime

class PlanningSession(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    story_id: PyObjectId
    created_by: PyObjectId
    status: str = "voting"  # voting, revealed, completed
    scale: str = "fibonacci"  # fibonacci, modified_fibonacci, t_shirt
    created_at: datetime

class Vote(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    session_id: PyObjectId
    user_id: PyObjectId
    username: Optional[str] = None
    value: str  # "1", "2", "3", "5", "8", "13", "21", "?", "coffee"
    created_at: datetime