from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..crud import (
    create_subtask,
    get_subtasks,
    get_subtask,
    update_subtask,
    delete_subtask,
    set_subtask_rank,
    log_audit,
    get_backlog_item,
)
from ..schemas import SubtaskCreate, SubtaskResponse
from ..utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/subtasks", tags=["subtasks"])

@router.post("/", response_model=SubtaskResponse)
async def create(item: SubtaskCreate, current_user: dict = Depends(require_roles('product_owner'))):
    # Validate parent task reference if provided (must be an item of type 'task')
    if item.parent_task_id is not None:
        t = await get_backlog_item(item.parent_task_id)
        if not t or getattr(t, 'type', None) != 'task':
            raise HTTPException(status_code=400, detail="Invalid parent_task_id")
    return await create_subtask(item)

@router.get("/", response_model=List[SubtaskResponse])
async def read_all(current_user: dict = Depends(get_current_user)):
    return await get_subtasks()

@router.get("/{item_id}", response_model=SubtaskResponse)
async def read_one(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_subtask(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return item

@router.put("/{item_id}", response_model=SubtaskResponse)
async def update(item_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    keys = set(update_data.keys()) if isinstance(update_data, dict) else set()
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    allowed = {"developer", "scrum_master", "product_owner"} if status_only else {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Validate parent task reference if provided in update
    if isinstance(update_data, dict) and "parent_task_id" in update_data and update_data.get("parent_task_id") is not None:
        t = await get_backlog_item(update_data["parent_task_id"])
        if not t or getattr(t, 'type', None) != 'task':
            raise HTTPException(status_code=400, detail="Invalid parent_task_id")

    item = await update_subtask(item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return item

@router.delete("/{item_id}")
async def delete(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    deleted = await delete_subtask(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return {"message": "Subtask deleted"}

@router.patch("/{item_id}/rank", response_model=SubtaskResponse)
async def set_rank(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    try:
        new_rank = float(body.get("rank"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rank")
    item = await set_subtask_rank(item_id, new_rank)
    if not item:
        raise HTTPException(status_code=404, detail="Subtask not found")
    await log_audit(current_user["id"], "subtask", item_id, "reorder", {"rank": new_rank})
    return item

@router.patch("/{item_id}/bulk", response_model=SubtaskResponse)
async def bulk_update(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    allowed = {"parent_task_id", "title", "description", "labels", "assignee", "story_points", "status", "rank"}
    invalid = set(body.keys()) - allowed
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {', '.join(sorted(invalid))}")
    item = await update_subtask(item_id, body)
    if not item:
        raise HTTPException(status_code=404, detail="Subtask not found")
    await log_audit(current_user["id"], "subtask", item_id, "bulk_update", body)
    return item

@router.patch("/{item_id}/move", response_model=SubtaskResponse)
async def move(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    # body: { "parent_task_id": "<id|null>" }
    if not isinstance(body, dict) or "parent_task_id" not in body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    pid = body.get("parent_task_id")
    if pid is not None:
        t = await get_backlog_item(pid)
        if not t or getattr(t, 'type', None) != 'task':
            raise HTTPException(status_code=400, detail="Invalid parent_task_id")
    item = await update_subtask(item_id, {"parent_task_id": pid})
    if not item:
        raise HTTPException(status_code=404, detail="Subtask not found")
    await log_audit(current_user["id"], "subtask", item_id, "move", {"parent_task_id": pid})
    return item
