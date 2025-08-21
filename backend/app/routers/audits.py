from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from ..crud import get_audits
from ..utils.auth import get_current_user

router = APIRouter(prefix="/audits", tags=["audits"])

@router.get("/")
async def read_audits(entity: str, entity_id: str, current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    if not entity or not entity_id:
        raise HTTPException(status_code=400, detail="entity and entity_id are required")
    return await get_audits(entity, entity_id)
