from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..crud import (
    create_task,
    get_tasks,
    get_task,
    update_task,
    delete_task,
    set_task_rank,
    log_audit,
    get_subtasks_for_task,
    get_story,
)
from ..schemas import TaskCreate, TaskResponse, SubtaskResponse
from ..utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskResponse)
async def create(item: TaskCreate, current_user: dict = Depends(require_roles('product_owner'))):
    # Validate story reference if provided
    if item.story_id is not None:
        story = await get_story(item.story_id)
        if not story:
            raise HTTPException(status_code=400, detail="Invalid story_id")
    return await create_task(item)

@router.get("/", response_model=List[TaskResponse])
async def read_all(current_user: dict = Depends(get_current_user)):
    return await get_tasks()

@router.get("/{item_id}", response_model=TaskResponse)
async def read_one(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_task(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    return item

@router.put("/{item_id}", response_model=TaskResponse)
async def update(item_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    keys = set(update_data.keys()) if isinstance(update_data, dict) else set()
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    allowed = {"developer", "scrum_master", "product_owner"} if status_only else {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Validate story reference if provided in update
    if isinstance(update_data, dict) and "story_id" in update_data and update_data.get("story_id") is not None:
        story = await get_story(update_data["story_id"])
        if not story:
            raise HTTPException(status_code=400, detail="Invalid story_id")

    item = await update_task(item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    return item

@router.delete("/{item_id}")
async def delete(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    # Prevent deleting a task that still has subtasks
    subtasks = await get_subtasks_for_task(item_id)
    if subtasks:
        raise HTTPException(status_code=409, detail="Task has subtasks")
    deleted = await delete_task(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@router.patch("/{item_id}/rank", response_model=TaskResponse)
async def set_rank(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    try:
        new_rank = float(body.get("rank"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rank")
    item = await set_task_rank(item_id, new_rank)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_audit(current_user["id"], "task", item_id, "reorder", {"rank": new_rank})
    return item

@router.patch("/{item_id}/bulk", response_model=TaskResponse)
async def bulk_update(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    allowed = {"story_id", "title", "description", "labels", "assignee", "story_points", "status", "sprint_id", "rank"}
    invalid = set(body.keys()) - allowed
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {', '.join(sorted(invalid))}")
    item = await update_task(item_id, body)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_audit(current_user["id"], "task", item_id, "bulk_update", body)
    return item

@router.get("/{item_id}/subtasks", response_model=List[SubtaskResponse])
async def list_subtasks(item_id: str, current_user: dict = Depends(get_current_user)):
    # Also verify task exists for clearer 404
    task = await get_task(item_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await get_subtasks_for_task(item_id)

@router.patch("/{item_id}/move", response_model=TaskResponse)
async def move(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    # body: { "story_id": "<id|null>" }
    if not isinstance(body, dict) or "story_id" not in body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    sid = body.get("story_id")
    if sid is not None:
        story = await get_story(sid)
        if not story:
            raise HTTPException(status_code=400, detail="Invalid story_id")
    item = await update_task(item_id, {"story_id": sid})
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_audit(current_user["id"], "task", item_id, "move", {"story_id": sid})
    return item
