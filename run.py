import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print("=" * 60)
    print("  TRAVELREALITY AI - Know Before You Go")
    print(f"  Starting server at: http://{host}:{port}")
    print("=" * 60)
    uvicorn.run("backend.app:app", host=host, port=port)
