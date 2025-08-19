from fastapi import APIRouter, Depends, HTTPException, status
from ..crud import create_comment, get_comments_for_item
from ..schemas import CommentCreate, CommentResponse
from ..models import PyObjectId
from typing import List
from .user import get_current_user

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("/", response_model=CommentResponse)
async def add_comment(comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    return await create_comment(comment, user_id)

@router.get("/{item_id}", response_model=List[CommentResponse])
async def get_comments(item_id: PyObjectId, current_user: dict = Depends(get_current_user)):
    return await get_comments_for_item(item_id)