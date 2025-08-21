from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..crud import (
    create_story,
    get_stories,
    get_story,
    update_story,
    delete_story,
    set_story_rank,
    log_audit,
    get_tasks_for_story,
)
from ..schemas import StoryCreate, StoryResponse, TaskResponse
from ..utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/stories", tags=["stories"])

@router.post("/", response_model=StoryResponse)
async def create(item: StoryCreate, current_user: dict = Depends(require_roles('product_owner'))):
    return await create_story(item)

@router.get("/", response_model=List[StoryResponse])
async def read_all(current_user: dict = Depends(get_current_user)):
    return await get_stories()

@router.get("/{item_id}", response_model=StoryResponse)
async def read_one(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_story(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    return item

@router.put("/{item_id}", response_model=StoryResponse)
async def update(item_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    keys = set(update_data.keys()) if isinstance(update_data, dict) else set()
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    allowed = {"developer", "scrum_master", "product_owner"} if status_only else {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    item = await update_story(item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    return item

@router.delete("/{item_id}")
async def delete(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    # Prevent deleting a story that still has tasks
    tasks = await get_tasks_for_story(item_id)
    if tasks:
        raise HTTPException(status_code=409, detail="Story has tasks")
    deleted = await delete_story(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted"}

@router.patch("/{item_id}/rank", response_model=StoryResponse)
async def set_rank(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    try:
        new_rank = float(body.get("rank"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rank")
    item = await set_story_rank(item_id, new_rank)
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    await log_audit(current_user["id"], "story", item_id, "reorder", {"rank": new_rank})
    return item

@router.patch("/{item_id}/bulk", response_model=StoryResponse)
async def bulk_update(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    allowed = {"epic_id", "title", "description", "acceptance_criteria", "labels", "assignee", "story_points", "status", "sprint_id", "cross_sprint", "rank"}
    invalid = set(body.keys()) - allowed
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {', '.join(sorted(invalid))}")
    item = await update_story(item_id, body)
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    await log_audit(current_user["id"], "story", item_id, "bulk_update", body)
    return item

@router.get("/{item_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(item_id: str, current_user: dict = Depends(get_current_user)):
    # Verify story exists for clearer 404
    story = await get_story(item_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return await get_tasks_for_story(item_id)
