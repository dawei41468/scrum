from . import database
from .models import (
    User,
    BacklogItem,
    Sprint,
    Comment,
    Epic,
    Story,
    Task,
    Subtask,
    PyObjectId,
)
from .schemas import (
    UserCreate,
    BacklogItemCreate,
    SprintCreate,
    CommentCreate,
    EpicCreate,
    StoryCreate,
    TaskCreate,
    SubtaskCreate,
)
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
    now = datetime.utcnow()
    item_dict.setdefault("created_at", now)
    item_dict.setdefault("updated_at", now)
    result = await database.db.backlog_items.insert_one(item_dict)  # type: ignore
    item_data = {**item_dict, "_id": str(result.inserted_id)}
    return BacklogItem.model_validate(item_data)

async def get_backlog_items() -> List[BacklogItem]:
    items: List[BacklogItem] = []
    async for doc in database.db.backlog_items.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(BacklogItem.model_validate(doc))
    return items

async def get_backlog_items_filtered(filters: Dict[str, Any]) -> List[BacklogItem]:
    query: Dict[str, Any] = {}
    # Map simple filters
    for key in ["type", "status", "epic_id", "assignee"]:
        val = filters.get(key)
        if val is not None:
            query[key] = val
    # Text search (basic regex OR $text if index exists)
    q = filters.get("q")
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    items: List[BacklogItem] = []
    cursor = database.db.backlog_items.find(query).sort("rank", 1)  # type: ignore
    async for doc in cursor:
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
    if not isinstance(update_data, dict):
        update_data = {}
    update_data["updated_at"] = datetime.utcnow()
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

async def create_comment(comment: CommentCreate, user_id: PyObjectId, username: str | None = None) -> Comment:
    comment_dict = comment.model_dump()
    comment_dict['user_id'] = user_id
    if username:
        comment_dict['username'] = username
    comment_dict['created_at'] = datetime.utcnow()
    result = await database.db.comments.insert_one(comment_dict)  # type: ignore
    comment_data = {**comment_dict, "_id": str(result.inserted_id)}
    return Comment.model_validate(comment_data)

async def get_comments_for_item(item_id: PyObjectId) -> List[Comment]:
    comments = []
    async for doc in database.db.comments.find({"item_id": item_id}):  # type: ignore
        # Backfill username for legacy comments
        if not doc.get("username") and doc.get("user_id"):
            try:
                udoc = await database.db.users.find_one({"_id": ObjectId(str(doc["user_id"]))})  # type: ignore
                if udoc and udoc.get("username"):
                    doc["username"] = udoc["username"]
            except Exception:
                pass
        doc["_id"] = str(doc["_id"])
        comments.append(Comment.model_validate(doc))
    return comments

async def get_comment(id: PyObjectId) -> Optional[Comment]:
    doc = await database.db.comments.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        # Backfill username for legacy comment
        if not doc.get("username") and doc.get("user_id"):
            try:
                udoc = await database.db.users.find_one({"_id": ObjectId(str(doc["user_id"]))})  # type: ignore
                if udoc and udoc.get("username"):
                    doc["username"] = udoc["username"]
            except Exception:
                pass
        doc["_id"] = str(doc["_id"])
        return Comment.model_validate(doc)
    return None

async def delete_comment(id: PyObjectId) -> bool:
    result = await database.db.comments.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

async def update_comment(id: PyObjectId, text: str) -> Optional[Comment]:
    await database.db.comments.update_one({"_id": ObjectId(id)}, {"$set": {"text": text}})  # type: ignore
    return await get_comment(id)

# Planning Poker CRUD operations
async def create_planning_session(story_id: PyObjectId, created_by: PyObjectId, scale: str = "fibonacci"):
    from .models import PlanningSession
    session_dict = {
        "story_id": ObjectId(story_id),
        "created_by": ObjectId(created_by),
        "status": "voting",
        "scale": scale,
        "created_at": datetime.utcnow()
    }
    result = await database.db.planning_sessions.insert_one(session_dict)  # type: ignore
    session_data = {**session_dict, "_id": str(result.inserted_id)}
    return PlanningSession.model_validate(session_data)

async def get_planning_session(id: PyObjectId):
    from .models import PlanningSession
    doc = await database.db.planning_sessions.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return PlanningSession.model_validate(doc)
    return None

async def get_planning_sessions_for_story(story_id: PyObjectId):
    from .models import PlanningSession
    sessions = []
    async for doc in database.db.planning_sessions.find({"story_id": ObjectId(story_id)}):  # type: ignore
        doc["_id"] = str(doc["_id"])
        sessions.append(PlanningSession.model_validate(doc))
    return sessions

async def update_session_status(id: PyObjectId, status: str) -> bool:
    result = await database.db.planning_sessions.update_one(
        {"_id": ObjectId(id)}, 
        {"$set": {"status": status}}
    )  # type: ignore
    return result.modified_count > 0

async def create_vote(session_id: PyObjectId, user_id: PyObjectId, value: str, username: Optional[str] = None):
    from .models import Vote
    # First, try to update existing vote for this user in this session
    existing_vote = await database.db.votes.find_one({
        "session_id": ObjectId(session_id),
        "user_id": ObjectId(user_id)
    })  # type: ignore
    
    if existing_vote:
        # Update existing vote
        await database.db.votes.update_one(
            {"_id": existing_vote["_id"]},
            {"$set": {"value": value, "created_at": datetime.utcnow()}}
        )  # type: ignore
        vote_data = {
            "_id": str(existing_vote["_id"]),
            "session_id": session_id,
            "user_id": user_id,
            "value": value,
            "created_at": datetime.utcnow()
        }
        if username:
            vote_data["username"] = username
        return Vote.model_validate(vote_data)
    else:
        # Create new vote
        vote_dict = {
            "session_id": ObjectId(session_id),
            "user_id": ObjectId(user_id),
            "value": value,
            "created_at": datetime.utcnow()
        }
        if username:
            vote_dict["username"] = username
        result = await database.db.votes.insert_one(vote_dict)  # type: ignore
        vote_data = {**vote_dict, "_id": str(result.inserted_id)}
        return Vote.model_validate(vote_data)

async def get_votes_for_session(session_id: PyObjectId):
    from .models import Vote
    votes = []
    async for doc in database.db.votes.find({"session_id": ObjectId(session_id)}):  # type: ignore
        # Backfill username for legacy votes
        if not doc.get("username") and doc.get("user_id"):
            try:
                udoc = await database.db.users.find_one({"_id": ObjectId(str(doc["user_id"]))})  # type: ignore
                if udoc and udoc.get("username"):
                    doc["username"] = udoc["username"]
            except Exception:
                pass
        doc["_id"] = str(doc["_id"])
        votes.append(Vote.model_validate(doc))
    return votes

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

# --- Rank utility ---
def compute_rank_between(prev_rank: float | None, next_rank: float | None) -> float:
    if prev_rank is None and next_rank is None:
        return 0.0
    if prev_rank is None:
        return float(next_rank) - 1.0
    if next_rank is None:
        return float(prev_rank) + 1.0
    return (float(prev_rank) + float(next_rank)) / 2.0

# --- Audit logging ---
async def log_audit(user_id: PyObjectId, entity: str, entity_id: PyObjectId, action: str, changes: Dict[str, Any] | None = None) -> None:
    payload = {
        "user_id": user_id,
        "entity": entity,
        "entity_id": entity_id,
        "action": action,
        "changes": changes or {},
        "created_at": datetime.utcnow(),
    }
    await database.db.audit_events.insert_one(payload)  # type: ignore

async def get_audits(entity: str, entity_id: PyObjectId) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    cursor = database.db.audit_events.find({"entity": entity, "entity_id": entity_id}).sort("created_at", -1)  # type: ignore
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        events.append(doc)
    return events

# --- Rank setters ---
async def set_epic_rank(id: PyObjectId, new_rank: float) -> Optional[Epic]:
    await database.db.epics.update_one({"_id": ObjectId(id)}, {"$set": {"rank": float(new_rank)}})  # type: ignore
    return await get_epic(id)

async def set_story_rank(id: PyObjectId, new_rank: float) -> Optional[Story]:
    await database.db.stories.update_one({"_id": ObjectId(id)}, {"$set": {"rank": float(new_rank)}})  # type: ignore
    return await get_story(id)

async def set_task_rank(id: PyObjectId, new_rank: float) -> Optional[Task]:
    await database.db.tasks.update_one({"_id": ObjectId(id)}, {"$set": {"rank": float(new_rank)}})  # type: ignore
    return await get_task(id)

async def set_subtask_rank(id: PyObjectId, new_rank: float) -> Optional[Subtask]:
    await database.db.subtasks.update_one({"_id": ObjectId(id)}, {"$set": {"rank": float(new_rank)}})  # type: ignore
    return await get_subtask(id)
# --- Epic CRUD ---
async def create_epic(epic: EpicCreate) -> Epic:
    data = epic.model_dump()
    result = await database.db.epics.insert_one(data)  # type: ignore
    saved = {**data, "_id": str(result.inserted_id)}
    return Epic.model_validate(saved)

async def get_epics() -> List[Epic]:
    items: List[Epic] = []
    async for doc in database.db.epics.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Epic.model_validate(doc))
    return items

async def get_epic(id: PyObjectId) -> Optional[Epic]:
    doc = await database.db.epics.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return Epic.model_validate(doc)
    return None

async def update_epic(id: PyObjectId, update_data: dict) -> Optional[Epic]:
    result = await database.db.epics.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    if result.matched_count:
        return await get_epic(id)
    return None

async def delete_epic(id: PyObjectId) -> bool:
    result = await database.db.epics.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

# --- Story CRUD ---
async def create_story(story: StoryCreate) -> Story:
    data = story.model_dump()
    result = await database.db.stories.insert_one(data)  # type: ignore
    saved = {**data, "_id": str(result.inserted_id)}
    return Story.model_validate(saved)

async def get_stories() -> List[Story]:
    items: List[Story] = []
    async for doc in database.db.stories.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Story.model_validate(doc))
    return items

async def get_story(id: PyObjectId) -> Optional[Story]:
    doc = await database.db.stories.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return Story.model_validate(doc)
    return None

async def update_story(id: PyObjectId, update_data: dict) -> Optional[Story]:
    result = await database.db.stories.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    if result.matched_count:
        return await get_story(id)
    return None

async def delete_story(id: PyObjectId) -> bool:
    result = await database.db.stories.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

# --- Task CRUD ---
async def create_task(task: TaskCreate) -> Task:
    data = task.model_dump()
    result = await database.db.tasks.insert_one(data)  # type: ignore
    saved = {**data, "_id": str(result.inserted_id)}
    return Task.model_validate(saved)

async def get_tasks() -> List[Task]:
    items: List[Task] = []
    async for doc in database.db.tasks.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Task.model_validate(doc))
    return items

async def get_tasks_for_story(story_id: PyObjectId) -> List[Task]:
    items: List[Task] = []
    async for doc in database.db.tasks.find({"story_id": story_id}):  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Task.model_validate(doc))
    return items

async def get_task(id: PyObjectId) -> Optional[Task]:
    doc = await database.db.tasks.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return Task.model_validate(doc)
    return None

async def update_task(id: PyObjectId, update_data: dict) -> Optional[Task]:
    result = await database.db.tasks.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    if result.matched_count:
        return await get_task(id)
    return None

async def delete_task(id: PyObjectId) -> bool:
    result = await database.db.tasks.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0

# --- Subtask CRUD ---
async def create_subtask(subtask: SubtaskCreate) -> Subtask:
    data = subtask.model_dump()
    result = await database.db.subtasks.insert_one(data)  # type: ignore
    saved = {**data, "_id": str(result.inserted_id)}
    return Subtask.model_validate(saved)

async def get_subtasks() -> List[Subtask]:
    items: List[Subtask] = []
    async for doc in database.db.subtasks.find():  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Subtask.model_validate(doc))
    return items

async def get_subtasks_for_task(parent_task_id: PyObjectId) -> List[Subtask]:
    items: List[Subtask] = []
    async for doc in database.db.subtasks.find({"parent_task_id": parent_task_id}):  # type: ignore
        doc["_id"] = str(doc["_id"])
        items.append(Subtask.model_validate(doc))
    return items

async def get_subtask(id: PyObjectId) -> Optional[Subtask]:
    doc = await database.db.subtasks.find_one({"_id": ObjectId(id)})  # type: ignore
    if doc:
        doc["_id"] = str(doc["_id"])
        return Subtask.model_validate(doc)
    return None

async def update_subtask(id: PyObjectId, update_data: dict) -> Optional[Subtask]:
    result = await database.db.subtasks.update_one({"_id": ObjectId(id)}, {"$set": update_data})  # type: ignore
    if result.matched_count:
        return await get_subtask(id)
    return None

async def delete_subtask(id: PyObjectId) -> bool:
    result = await database.db.subtasks.delete_one({"_id": ObjectId(id)})  # type: ignore
    return result.deleted_count > 0