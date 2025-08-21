from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional

from ..crud import (
    create_backlog_item,
    get_backlog_items_filtered,
    get_backlog_item,
    update_backlog_item,
    delete_backlog_item,
    log_audit,
)
from ..schemas import ItemCreate, ItemUpdate, ItemResponse
from ..utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/items", tags=["items"])

@router.post("/", response_model=ItemResponse)
async def create_item(item: ItemCreate, current_user: dict = Depends(require_roles('product_owner'))):
    created = await create_backlog_item(item)
    await log_audit(current_user["id"], "item", created.id, "create", item.model_dump())
    # Convert to response model (shared shape with models.BacklogItem)
    return ItemResponse.model_validate(created.model_dump())

@router.get("/", response_model=List[ItemResponse])
async def list_items(
    type: Optional[str] = None,
    epic_id: Optional[str] = None,
    status: Optional[str] = None,
    assignee: Optional[str] = None,
    q: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    filters = {k: v for k, v in {
        "type": type,
        "epic_id": epic_id,
        "status": status,
        "assignee": assignee,
        "q": q,
    }.items() if v is not None}
    items = await get_backlog_items_filtered(filters)
    return [ItemResponse.model_validate(i.model_dump()) for i in items]

@router.get("/{item_id}", response_model=ItemResponse)
async def read_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await get_backlog_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemResponse.model_validate(item.model_dump())

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, update: ItemUpdate, current_user: dict = Depends(get_current_user)):
    data = {k: v for k, v in update.model_dump(exclude_unset=True).items()}
    keys = set(data.keys())
    status_only = len(keys) > 0 and keys.issubset({"status"})
    role = current_user.get("role")
    allowed = {"developer", "scrum_master", "product_owner"} if status_only else {"product_owner"}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    saved = await update_backlog_item(item_id, data)
    if not saved:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user["id"], "item", item_id, "update", data)
    return ItemResponse.model_validate(saved.model_dump())

@router.patch("/{item_id}", response_model=ItemResponse)
async def patch_item(item_id: str, update: ItemUpdate, current_user: dict = Depends(get_current_user)):
    return await update_item(item_id, update, current_user)  # reuse same rules

@router.delete("/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(require_roles('product_owner'))):
    deleted = await delete_backlog_item(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user["id"], "item", item_id, "delete", None)
    return {"message": "Item deleted"}

@router.post("/{item_id}/rank", response_model=ItemResponse)
async def set_rank(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    try:
        new_rank = float(body.get("rank"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rank")
    saved = await update_backlog_item(item_id, {"rank": new_rank})
    if not saved:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user["id"], "item", item_id, "reorder", {"rank": new_rank})
    return ItemResponse.model_validate(saved.model_dump())

@router.patch("/{item_id}/bulk", response_model=ItemResponse)
async def bulk_update_item(item_id: str, body: dict, current_user: dict = Depends(require_roles('product_owner'))):
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Invalid payload")
    allowed = {"type", "title", "description", "status", "labels", "priority", "story_points", "assignee", "rank", "epic_id", "acceptance_criteria"}
    invalid = set(body.keys()) - allowed
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {', '.join(sorted(invalid))}")
    saved = await update_backlog_item(item_id, body)
    if not saved:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user["id"], "item", item_id, "bulk_update", body)
    return ItemResponse.model_validate(saved.model_dump())
