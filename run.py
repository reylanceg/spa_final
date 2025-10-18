import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Apply monkey patching BEFORE importing Flask or any other libraries
# This must be done at the very top of the entry point
async_mode = os.getenv("SOCKETIO_ASYNC_MODE", "threading")
if async_mode == "eventlet":
    try:
        import eventlet
        eventlet.monkey_patch()
        print("[INFO] Using eventlet for async mode")
    except Exception as e:
        print(f"[WARNING] Eventlet failed: {e}")
        print("[INFO] Falling back to threading mode")
        async_mode = "threading"
elif async_mode == "gevent":
    try:
        import gevent.monkey
        gevent.monkey.patch_all()
        print("[INFO] Using gevent for async mode")
    except Exception as e:
        print(f"[WARNING] Gevent failed: {e}")
        print("[INFO] Falling back to threading mode")
        async_mode = "threading"

if async_mode == "threading":
    print("[INFO] Using threading mode (Python 3.13 compatible)")

from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
