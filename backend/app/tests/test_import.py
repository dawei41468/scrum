try:
    from app.main import app
    print("Successfully imported app from app.main")
except ImportError as e:
    print(f"Failed to import app from app.main: {e}")

try:
    from main import app
    print("Successfully imported app from main")
except ImportError as e:
    print(f"Failed to import app from main: {e}")

try:
    import app.main
    print("Successfully imported app.main")
except ImportError as e:
    print(f"Failed to import app.main: {e}")