import os
import sys
import asyncio
import uuid

# Ensure backend root is on sys.path before importing app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Set a clean event loop policy and loop for Motor/AnyIO compatibility in tests
asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
if asyncio.get_event_loop().is_closed():
    asyncio.set_event_loop(asyncio.new_event_loop())

# Optionally, you can define shared fixtures here if needed.

# Point to a unique MongoDB database for tests to avoid state leakage between runs
unique_db = f"scrumdb_test_{uuid.uuid4().hex}"
default_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/scrumdb")
if default_uri.rsplit('/', 1)[-1]:
    base = default_uri.rsplit('/', 1)[0]
    os.environ["MONGO_URI"] = f"{base}/{unique_db}"
else:
    os.environ["MONGO_URI"] = f"{default_uri}{unique_db}"
