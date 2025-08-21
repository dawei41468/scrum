from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..crud import (
    create_epic,
    get_epics,
    get_epic,
    update_epic,
    delete_epic,
    set_epic_rank,
    log_audit,
)
from ..schemas import EpicCreate, EpicResponse
from ..utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/epics", tags=["epics"])

@router.post("/", response_model=EpicResponse)
async def create(item: EpicCreate, current_user: dict = Depends(require_roles('product_owner'))):
    return await create_epic(item)

@router.get("/", response_model=List[EpicResponse])
async def read_all(current_user: dict = Depends(get_current_user)):
    return await get_epics()

@router.get("/{item_id}", response_model=EpicResponse)
async def read_one(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_epic(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Epic not found")
    return item

@router.put("/{item_id}", response_model=EpicResponse)
async def update(item_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    keys = set(update_data.keys()) if isinstance(update_data, dict) else set()
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    allowed = {"developer", "scrum_master", "product_owner"} if status_only else {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    item = await update_epic(item_id, update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Epic not found")
    return item

@router.delete("/{item_id}")
async def delete(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    deleted = await delete_epic(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Epic not found")
    return {"message": "Epic deleted"}

@router.patch("/{item_id}/rank", response_model=EpicResponse)
async def set_rank(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    try:
        new_rank = float(body.get("rank"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rank")
    item = await set_epic_rank(item_id, new_rank)
    if not item:
        raise HTTPException(status_code=404, detail="Epic not found")
    await log_audit(current_user["id"], "epic", item_id, "reorder", {"rank": new_rank})
    return item

@router.patch("/{item_id}/bulk", response_model=EpicResponse)
async def bulk_update(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    allowed = {"title", "description", "labels", "assignee", "story_points", "status", "rank"}
    invalid = set(body.keys()) - allowed
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {', '.join(sorted(invalid))}")
    item = await update_epic(item_id, body)
    if not item:
        raise HTTPException(status_code=404, detail="Epic not found")
    await log_audit(current_user["id"], "epic", item_id, "bulk_update", body)
    return item
