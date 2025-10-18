"""
Test script to verify async mode integration with Flask-SocketIO
Supports: eventlet, gevent, threading
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check async mode
async_mode = os.getenv("SOCKETIO_ASYNC_MODE", "threading")
print(f"[INFO] SOCKETIO_ASYNC_MODE: {async_mode}")

# Apply monkey patching if configured
if async_mode == "eventlet":
    print("[INFO] Applying eventlet monkey patching...")
    try:
        import eventlet
        eventlet.monkey_patch()
        print(f"[SUCCESS] Eventlet version {eventlet.__version__} loaded and monkey patched")
    except Exception as e:
        print(f"[ERROR] Eventlet failed: {e}")
        print("[INFO] Consider using threading mode for Python 3.13+")
elif async_mode == "gevent":
    print("[INFO] Applying gevent monkey patching...")
    try:
        import gevent
        import gevent.monkey
        gevent.monkey.patch_all()
        print(f"[SUCCESS] Gevent version {gevent.__version__} loaded and monkey patched")
    except Exception as e:
        print(f"[ERROR] Gevent failed: {e}")
        print("[INFO] Falling back to threading mode")
elif async_mode == "threading":
    print(f"[INFO] Using threading mode (Python 3.13 compatible)")
    print(f"[SUCCESS] Threading is built into Python - no installation required")
else:
    print(f"[WARNING] Unknown async mode: {async_mode}")
    print(f"[INFO] Valid modes: threading, eventlet, gevent")

# Import Flask app
print("[INFO] Importing Flask application...")
from app import create_app, socketio

app = create_app()

# Verify SocketIO configuration
print(f"[INFO] SocketIO async_mode: {socketio.async_mode}")
print(f"[SUCCESS] Application created successfully")

# Print server info
print("\n" + "="*60)
print("ASYNC MODE INTEGRATION TEST RESULTS")
print("="*60)
print(f"Environment Variable: SOCKETIO_ASYNC_MODE = {async_mode}")
print(f"SocketIO Actual Mode: {socketio.async_mode}")
print(f"Concurrency Type: {'Green Threads' if async_mode in ['eventlet', 'gevent'] else 'OS Threads'}")
print(f"Python 3.13 Compatible: {'YES' if async_mode == 'threading' else 'NO (requires Python 3.11/3.12)'}")
print("="*60)

if __name__ == "__main__":
    print(f"\n[INFO] Starting Flask-SocketIO server with {async_mode}...")
    print("[INFO] Server will run on http://0.0.0.0:5000")
    print("[INFO] Press CTRL+C to stop\n")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
