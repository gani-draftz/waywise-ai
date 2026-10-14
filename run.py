import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  TRAVELREALITY AI - Know Before You Go")
    print("  Starting server at: http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
