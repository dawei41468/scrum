from pydantic import BaseModel
from .models import PyObjectId
from typing import List
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
    item_id: PyObjectId
    created_at: datetime