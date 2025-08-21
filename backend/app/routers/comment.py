from fastapi import APIRouter, Depends, HTTPException, status
from ..crud import create_comment, get_comments_for_item, get_comment, delete_comment, update_comment
from ..schemas import CommentCreate, CommentResponse, CommentUpdate
from ..models import PyObjectId
from typing import List
from ..utils.auth import get_current_user

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("/", response_model=CommentResponse)
async def add_comment(comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    username = current_user.get("username")
    return await create_comment(comment, user_id, username)

@router.get("/{item_id}", response_model=List[CommentResponse])
async def get_comments(item_id: PyObjectId, current_user: dict = Depends(get_current_user)):
    return await get_comments_for_item(item_id)

@router.delete("/{comment_id}")
async def remove_comment(comment_id: PyObjectId, current_user: dict = Depends(get_current_user)):
    # Only the author, or scrum_master/product_owner can delete
    existing = await get_comment(comment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    role = current_user.get("role")
    user_id = current_user.get("id")
    allowed_roles = {"product_owner", "scrum_master"}
    if existing.user_id != user_id and role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    deleted = await delete_comment(comment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}

@router.patch("/{comment_id}", response_model=CommentResponse)
async def edit_comment(comment_id: PyObjectId, payload: CommentUpdate, current_user: dict = Depends(get_current_user)):
    # Only the author, or scrum_master/product_owner can edit
    existing = await get_comment(comment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    role = current_user.get("role")
    user_id = current_user.get("id")
    allowed_roles = {"product_owner", "scrum_master"}
    if existing.user_id != user_id and role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    updated = await update_comment(comment_id, payload.text)
    if not updated:
        raise HTTPException(status_code=404, detail="Comment not found")
    return updated