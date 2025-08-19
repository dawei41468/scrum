from fastapi import APIRouter, Depends, HTTPException
from ..crud import create_sprint, get_sprints, get_sprint, update_sprint, delete_sprint
from ..crud import add_item_to_sprint, remove_item_from_sprint, get_burndown_snapshot
from ..schemas import SprintCreate, SprintResponse
from typing import List

router = APIRouter(prefix="/sprints", tags=["sprints"])

# Auth dependency
from ..utils.auth import get_current_user

@router.post("/", response_model=SprintResponse)
async def create_sprint_item(sprint: SprintCreate, current_user: dict = Depends(get_current_user)):
    return await create_sprint(sprint)

@router.get("/", response_model=List[SprintResponse])
async def read_sprints(current_user: dict = Depends(get_current_user)):
    return await get_sprints()

@router.get("/{sprint_id}", response_model=SprintResponse)
async def read_sprint(sprint_id: str, current_user: dict = Depends(get_current_user)):
    sprint = await get_sprint(sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint

@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint_item(sprint_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    sprint = await update_sprint(sprint_id, update_data)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint

@router.delete("/{sprint_id}")
async def delete_sprint_item(sprint_id: str, current_user: dict = Depends(get_current_user)):
    deleted = await delete_sprint(sprint_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"message": "Sprint deleted"}

@router.post("/{sprint_id}/items/{item_id}", response_model=SprintResponse)
async def add_item(sprint_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    sprint = await add_item_to_sprint(sprint_id, item_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint

@router.delete("/{sprint_id}/items/{item_id}", response_model=SprintResponse)
async def remove_item(sprint_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    sprint = await remove_item_from_sprint(sprint_id, item_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint

@router.get("/{sprint_id}/burndown")
async def burndown(sprint_id: str, current_user: dict = Depends(get_current_user)):
    data = await get_burndown_snapshot(sprint_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return data