from fastapi import APIRouter, HTTPException, Depends
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from ..models import PlanningSession, Vote
from ..schemas import (
    PlanningSessionCreate, PlanningSessionResponse, 
    VoteCreate, VoteResponse, SessionRevealResponse, EstimateUpdate
)
from ..crud import (
    create_planning_session, get_planning_session, get_planning_sessions_for_story,
    create_vote, get_votes_for_session, update_session_status,
    get_story, update_story
)
from ..utils.auth import get_current_user, SECRET_KEY, ALGORITHM
from ..models import PyObjectId

router = APIRouter(prefix="/planning", tags=["planning"])


# --- Simple WS connection manager with per-session rooms ---
class ConnectionManager:
    def __init__(self):
        # session_id -> set of WebSocket
        self.rooms: dict[str, set[WebSocket]] = {}

    def _room(self, session_id: str) -> set[WebSocket]:
        return self.rooms.setdefault(session_id, set())

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self._room(session_id).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        room = self.rooms.get(session_id)
        if room and websocket in room:
            room.remove(websocket)
            if not room:
                self.rooms.pop(session_id, None)

    async def broadcast(self, session_id: str, message: dict):
        room = list(self.rooms.get(session_id, set()))
        for ws in room:
            try:
                await ws.send_json(message)
            except Exception:
                # Drop broken sockets silently
                self.disconnect(session_id, ws)


manager = ConnectionManager()


def _decode_token(token: str | None) -> dict | None:
    """Decode JWT without FastAPI dependency injection (for WebSocket)."""
    if not token:
        return None
    try:
        import jwt  # local import to avoid circulars
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("id")
        role = payload.get("role")
        if not username or not user_id:
            return None
        return {"username": username, "id": user_id, "role": role}
    except Exception:
        return None


@router.websocket("/ws/{session_id}")
async def planning_ws(websocket: WebSocket, session_id: str):
    # Expect token via query string: ?token=...
    token = websocket.query_params.get("token")
    user = _decode_token(token)
    if not user:
        await websocket.close(code=4401)  # Unauthorized
        return

    await manager.connect(session_id, websocket)
    try:
        # Notify join
        await manager.broadcast(session_id, {
            "type": "joined",
            "session_id": session_id,
            "user_id": user["id"],
            "username": user.get("username")
        })
        # WS is broadcast-only for now; consume pings to keep alive
        while True:
            _ = await websocket.receive_text()
            # No-op; clients may send keepalive/ping
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        await manager.broadcast(session_id, {
            "type": "left",
            "session_id": session_id,
            "user_id": user["id"],
            "username": user.get("username")
        })

@router.post("/sessions", response_model=PlanningSessionResponse)
async def create_session(
    session_data: PlanningSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new Planning Poker session for a story"""
    # Verify story exists
    story = await get_story(session_data.story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check if active session already exists for this story
    existing_sessions = await get_planning_sessions_for_story(session_data.story_id)
    active_session = next((s for s in existing_sessions if s.status == "voting"), None)
    if active_session:
        # Idempotent behavior: return the existing active session instead of erroring
        votes = await get_votes_for_session(str(active_session.id))
        return PlanningSessionResponse(
            id=str(active_session.id),
            story_id=str(active_session.story_id),
            created_by=str(active_session.created_by),
            status=active_session.status,
            scale=active_session.scale,
            created_at=active_session.created_at,
            vote_count=len(votes),
            votes_revealed=(active_session.status == "revealed")
        )
    
    session = await create_planning_session(
        story_id=session_data.story_id,
        created_by=current_user["id"],
        scale=session_data.scale
    )
    
    # Broadcast session created
    try:
        await manager.broadcast(str(session.id), {
            "type": "session_created",
            "session_id": str(session.id),
            "story_id": str(session.story_id),
            "status": session.status,
            "scale": session.scale,
            "created_at": session.created_at.isoformat(),
        })
    except Exception:
        pass

    return PlanningSessionResponse(
        id=str(session.id),
        story_id=str(session.story_id),
        created_by=str(session.created_by),
        status=session.status,
        scale=session.scale,
        created_at=session.created_at,
        vote_count=0,
        votes_revealed=False
    )

@router.get("/sessions/{session_id}", response_model=PlanningSessionResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get Planning Poker session details"""
    session = await get_planning_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Planning session not found")
    
    votes = await get_votes_for_session(session_id)
    
    return PlanningSessionResponse(
        id=str(session.id),
        story_id=str(session.story_id),
        created_by=str(session.created_by),
        status=session.status,
        scale=session.scale,
        created_at=session.created_at,
        vote_count=len(votes),
        votes_revealed=(session.status == "revealed")
    )

@router.post("/sessions/{session_id}/vote", response_model=VoteResponse)
async def submit_vote(
    session_id: str,
    vote_data: VoteCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit or update a vote for the session"""
    session = await get_planning_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Planning session not found")
    
    if session.status != "voting":
        raise HTTPException(status_code=400, detail="Session is not in voting state")
    
    # Validate vote value based on scale
    valid_values = get_valid_values_for_scale(session.scale)
    if vote_data.value not in valid_values:
        raise HTTPException(status_code=400, detail=f"Invalid vote value for {session.scale} scale")
    
    vote = await create_vote(
        session_id=session_id,
        user_id=current_user["id"],
        value=vote_data.value,
        username=current_user.get("username")
    )
    
    # Broadcast anonymized vote event (no value)
    try:
        # Count votes after submission
        votes = await get_votes_for_session(session_id)
        await manager.broadcast(session_id, {
            "type": "vote_submitted",
            "session_id": session_id,
            "vote_count": len(votes),
            "user_id": current_user["id"],
            "username": current_user.get("username"),
        })
    except Exception:
        pass

    return VoteResponse(
        id=str(vote.id),
        session_id=str(vote.session_id),
        user_id=str(vote.user_id),
        username=current_user.get("username"),
        value=vote.value,
        created_at=vote.created_at
    )

@router.post("/sessions/{session_id}/reveal", response_model=SessionRevealResponse)
async def reveal_votes(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reveal all votes for the session"""
    session = await get_planning_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Planning session not found")
    
    # Only session creator or privileged roles can reveal
    user_role = current_user.get("role", "")
    if (str(session.created_by) != current_user["id"] and 
        user_role not in ["product_owner", "scrum_master"]):
        raise HTTPException(status_code=403, detail="Not authorized to reveal votes")
    
    if session.status != "voting":
        raise HTTPException(status_code=400, detail="Session is not in voting state")
    
    # Update session status to revealed
    await update_session_status(session_id, "revealed")
    
    # Get all votes
    votes = await get_votes_for_session(session_id)
    vote_responses = [
        VoteResponse(
            id=str(vote.id),
            session_id=str(vote.session_id),
            user_id=str(vote.user_id),
            username=getattr(vote, 'username', None),
            value=vote.value,
            created_at=vote.created_at
        )
        for vote in votes
    ]
    
    # Calculate statistics
    numeric_votes = []
    for vote in votes:
        if vote.value.isdigit() or vote.value in ["0.5", "1", "2", "3", "5", "8", "13", "21"]:
            try:
                numeric_votes.append(float(vote.value))
            except ValueError:
                pass
    
    average = sum(numeric_votes) / len(numeric_votes) if numeric_votes else None
    median = None
    if numeric_votes:
        sorted_votes = sorted(numeric_votes)
        n = len(sorted_votes)
        median_val = sorted_votes[n//2] if n % 2 == 1 else (sorted_votes[n//2-1] + sorted_votes[n//2]) / 2
        median = str(median_val)
    
    # Broadcast revealed votes with values
    try:
        await manager.broadcast(session_id, {
            "type": "votes_revealed",
            "session_id": session_id,
            "votes": [
                {
                    "id": v.id and str(v.id),
                    "session_id": str(v.session_id),
                    "user_id": str(v.user_id),
                    "username": getattr(v, 'username', None),
                    "value": v.value,
                    "created_at": v.created_at.isoformat(),
                } for v in votes
            ],
            "average": average,
            "median": median,
        })
    except Exception:
        pass

    return SessionRevealResponse(
        session_id=session_id,
        votes=vote_responses,
        average=average,
        median=median
    )

@router.put("/sessions/{session_id}/estimate", response_model=dict)
async def set_final_estimate(
    session_id: str,
    estimate_data: EstimateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Set the final estimate and complete the session"""
    session = await get_planning_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Planning session not found")
    
    # Only session creator or privileged roles can set estimate
    user_role = current_user.get("role", "")
    if (str(session.created_by) != current_user["id"] and 
        user_role not in ["product_owner", "scrum_master"]):
        raise HTTPException(status_code=403, detail="Not authorized to set estimate")
    
    if session.status not in ["revealed", "voting"]:
        raise HTTPException(status_code=400, detail="Cannot set estimate for completed session")
    
    # Update story with final estimate
    await update_story(str(session.story_id), {"story_points": int(estimate_data.final_estimate)})
    
    # Mark session as completed
    await update_session_status(session_id, "completed")
    # Broadcast completion
    try:
        await manager.broadcast(session_id, {
            "type": "session_completed",
            "session_id": session_id,
            "final_estimate": estimate_data.final_estimate,
        })
    except Exception:
        pass

    return {"message": "Estimate set successfully", "final_estimate": estimate_data.final_estimate}

def get_valid_values_for_scale(scale: str) -> List[str]:
    """Get valid vote values for a given scale"""
    scales = {
        "fibonacci": ["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"],
        "modified_fibonacci": ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "coffee"],
        "t_shirt": ["XS", "S", "M", "L", "XL", "XXL", "?", "coffee"]
    }
    return scales.get(scale, scales["fibonacci"])
