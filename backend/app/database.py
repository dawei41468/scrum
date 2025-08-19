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

async def close_db():
    global client
    if client is not None:
        client.close()
        client = None