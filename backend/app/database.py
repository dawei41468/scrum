import motor.motor_asyncio
from os import environ

MONGO_URI = environ.get("MONGO_URI", "mongodb://localhost:27017/scrumdb")

client = None
db = None

async def init_db():
    global client, db
    if client is None:
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
        db = client.get_database()
        # Create minimal indexes used by queries and ordering
        # Epics
        await db.epics.create_index([("rank", 1)])  # type: ignore
        await db.epics.create_index([("status", 1)])  # type: ignore
        # Stories
        await db.stories.create_index([("epic_id", 1)])  # type: ignore
        await db.stories.create_index([("sprint_id", 1)])  # type: ignore
        await db.stories.create_index([("status", 1)])  # type: ignore
        await db.stories.create_index([("rank", 1)])  # type: ignore
        # Tasks
        await db.tasks.create_index([("story_id", 1)])  # type: ignore
        await db.tasks.create_index([("sprint_id", 1)])  # type: ignore
        await db.tasks.create_index([("status", 1)])  # type: ignore
        await db.tasks.create_index([("rank", 1)])  # type: ignore
        # Subtasks
        await db.subtasks.create_index([("parent_task_id", 1)])  # type: ignore
        await db.subtasks.create_index([("status", 1)])  # type: ignore
        await db.subtasks.create_index([("rank", 1)])  # type: ignore
        # Audit events
        await db.audit_events.create_index([("entity", 1)])  # type: ignore
        await db.audit_events.create_index([("entity_id", 1)])  # type: ignore
        await db.audit_events.create_index([("created_at", -1)])  # type: ignore

async def close_db():
    global client
    if client is not None:
        client.close()
        client = None