import os
from dotenv import load_dotenv
load_dotenv()

async_mode = os.getenv("SOCKETIO_ASYNC_MODE", "threading")
print(f"[INFO] SOCKETIO_ASYNC_MODE: {async_mode}")

from app import create_app, socketio

app = create_app()
print(f"[INFO] SocketIO async_mode: {socketio.async_mode}")
print(f"[SUCCESS] Application created successfully")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("SPA MANAGEMENT SYSTEM - STARTING SERVER")
    print("="*60)
    print(f"Async Mode: {async_mode}")
    print(f"Concurrency Type: Green Threads (Eventlet)")
    print(f"Server: http://localhost:5000")
    print(f"Debug Mode: ON")
    print(f"Auto-reloader: ON")
    print("="*60)
    print("[INFO] Press CTRL+C to stop\n")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=True)
