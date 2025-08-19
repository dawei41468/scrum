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
    description: str
    priority: int
    story_points: int
    status: str = "todo"  # todo, in_progress, done

class Sprint(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    goal: str
    duration: int  # in days
    backlog_items: List[PyObjectId] = []

class Comment(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    text: str
    user_id: PyObjectId
    item_id: PyObjectId
    created_at: datetime