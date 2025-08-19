from . import database
from .models import User, BacklogItem, Sprint, Comment, PyObjectId
from .schemas import UserCreate, BacklogItemCreate, SprintCreate, CommentCreate
from .utils.auth import get_password_hash
from bson import ObjectId
from typing import List, Optional, Dict, Any
from datetime import datetime

async def create_user(user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump()
    user_dict['password'] = hashed_password
    result = await database.db.users.insert_one(user_dict)  # type: ignore
    user_data = {**user_dict, "_id": str(result.inserted_id)}
    return User.model_validate(user_data)

async def get_user(username: str) -> Optional[User]:
    user_data = await database.db.users.find_one({"username": username})  # type: ignore
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return User.model_validate(user_data)
    return None

async def create_backlog_item(item: BacklogItemCreate) -> BacklogItem:
    item_dict = item.model_dump()
    result = await database.db.backlog_items.insert_one(item_dict)  # type: ignore
    item_data = {**item_dict, "_id": str(result.inserted_id)}
    return BacklogItem.model_validate(item_data)

async def get_backlog_items() -> List[BacklogItem]:
    items = []
    async for doc in database.db.backlog_items.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(BacklogItem.model_validate(doc))
    return items

async def get_backlog_item(id: PyObjectId) -> Optional[BacklogItem]:
    doc = await database.db.backlog_items.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return BacklogItem.model_validate(doc)
    return None

async def update_backlog_item(id: PyObjectId, update_data: dict) -> Optional[BacklogItem]:
    result = await database.db.backlog_items.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    # Return the item if it exists, regardless of whether fields actually changed
    if result.matched_count:
        return await get_backlog_item(id)
    return None

async def delete_backlog_item(id: PyObjectId) -> bool:
    result = await database.db.backlog_items.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

async def create_sprint(sprint: SprintCreate) -> Sprint:
    sprint_dict = sprint.model_dump()
    result = await database.db.sprints.insert_one(sprint_dict)  # type: ignore
    sprint_data = {**sprint_dict, "_id": str(result.inserted_id)}
    return Sprint.model_validate(sprint_data)

async def get_sprints() -> List[Sprint]:
    sprints = []
    async for doc in database.db.sprints.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        sprints.append(Sprint.model_validate(doc))
    return sprints

async def get_sprint(id: PyObjectId) -> Optional[Sprint]:
    doc = await database.db.sprints.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return Sprint.model_validate(doc)
    return None

async def update_sprint(id: PyObjectId, update_data: dict) -> Optional[Sprint]:
    result = await database.db.sprints.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    if result.matched_count:
        return await get_sprint(id)
    return None

async def delete_sprint(id: PyObjectId) -> bool:
    result = await database.db.sprints.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

async def create_comment(comment: CommentCreate, user_id: PyObjectId) -> Comment:
    comment_dict = comment.model_dump()
    comment_dict['user_id'] = user_id
    comment_dict['created_at'] = datetime.utcnow()
    result = await database.db.comments.insert_one(comment_dict)  # type: ignore
    comment_data = {**comment_dict, "_id": str(result.inserted_id)}
    return Comment.model_validate(comment_data)

async def get_comments_for_item(item_id: PyObjectId) -> List[Comment]:
    comments = []
    async for doc in database.db.comments.find({"item_id": item_id}):  # type: ignore
        doc["_id"] = str(doc["_id"])
        comments.append(Comment.model_validate(doc))
    return comments

# --- Sprint item management helpers ---
async def add_item_to_sprint(sprint_id: PyObjectId, item_id: PyObjectId) -> Optional[Sprint]:
    sprint_doc = await database.db.sprints.find_one({"_id": ObjectId(sprint_id)})  # type: ignore
    if not sprint_doc:
        return None
    backlog_items = sprint_doc.get("backlog_items", [])
    if item_id not in backlog_items:
        backlog_items.append(item_id)
        await database.db.sprints.update_one(
            {"_id": ObjectId(sprint_id)}, {"$set": {"backlog_items": backlog_items}}
        )  # type: ignore
    return await get_sprint(sprint_id)

async def remove_item_from_sprint(sprint_id: PyObjectId, item_id: PyObjectId) -> Optional[Sprint]:
    sprint_doc = await database.db.sprints.find_one({"_id": ObjectId(sprint_id)})  # type: ignore
    if not sprint_doc:
        return None
    backlog_items = sprint_doc.get("backlog_items", [])
    if item_id in backlog_items:
        backlog_items = [bid for bid in backlog_items if bid != item_id]
        await database.db.sprints.update_one(
            {"_id": ObjectId(sprint_id)}, {"$set": {"backlog_items": backlog_items}}
        )  # type: ignore
    return await get_sprint(sprint_id)

async def get_burndown_snapshot(sprint_id: PyObjectId) -> Optional[Dict[str, Any]]:
    sprint = await get_sprint(sprint_id)
    if not sprint:
        return None
    total = 0
    remaining = 0
    for item_oid in sprint.backlog_items:
        doc = await database.db.backlog_items.find_one({"_id": ObjectId(item_oid)})  # type: ignore
        if not doc:
            continue
        sp = int(doc.get("story_points", 0))
        total += sp
        if doc.get("status", "todo") != "done":
            remaining += sp
    completed = max(total - remaining, 0)
    return {"total": total, "remaining": remaining, "completed": completed}