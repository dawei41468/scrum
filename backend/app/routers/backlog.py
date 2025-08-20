from fastapi import APIRouter, Depends, HTTPException
from ..crud import create_backlog_item, get_backlog_items, get_backlog_item, update_backlog_item, delete_backlog_item
from ..schemas import BacklogItemCreate, BacklogItemResponse
from typing import List

router = APIRouter(prefix="/backlogs", tags=["backlogs"])

# Auth dependency
from ..utils.auth import get_current_user, require_roles

@router.post("/", response_model=BacklogItemResponse)
async def create_item(item: BacklogItemCreate, current_user: dict = Depends(require_roles('product_owner'))):
    return await create_backlog_item(item)

@router.get("/", response_model=List[BacklogItemResponse])
async def read_items(current_user: dict = Depends(get_current_user)):
    return await get_backlog_items()

@router.get("/{item_id}", response_model=BacklogItemResponse)
async def read_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_backlog_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}", response_model=BacklogItemResponse)
async def update_item(item_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    # Allow status-only updates for developers, scrum masters, and product owners
    # Any other field updates require product_owner
    keys = set(update_data.keys()) if isinstance(update_data, dict) else set()
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    if status_only:
        allowed = {"developer", "scrum_master", "product_owner"}
    else:
        allowed = {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    item = await update_backlog_item(item_id, update_data)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.delete("/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    deleted = await delete_backlog_item(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}