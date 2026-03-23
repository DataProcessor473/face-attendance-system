"""
api.py - Supabase version
Stores encodings and attendance in Supabase cloud database
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import base64
from deepface import DeepFace
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="Face Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Supabase client ───────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Connected to Supabase")

# ── Session tracker (in-memory) ───────────────────────────────────────────────
session_marked: set = set()
# ─────────────────────────────────────────────────────────────────────────────


def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def decode_base64_image(image_data: str):
    if "," in image_data:
        image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    np_arr    = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def load_encodings_from_supabase():
    """Load all encodings from Supabase."""
    response = supabase.table("encodings").select("*").execute()
    return response.data or []


def process_frame(frame):
    try:
        emb_obj = DeepFace.represent(
            img_path=frame,
            model_name="Facenet",
            enforce_detection=False
        )
        emb = np.array(emb_obj[0]["embedding"], dtype=np.float64)

        # Load encodings from Supabase
        records = load_encodings_from_supabase()
        if not records:
            return {"name": "Unknown", "confidence": 0.0, "marked": False,
                    "already_marked": False, "session": [], "time": datetime.now().strftime("%H:%M:%S")}

        sims     = [cosine_similarity(emb, r["embedding"]) for r in records]
        best_idx = int(np.argmax(sims))
        best_sim = sims[best_idx]
        confidence = round(best_sim * 100, 1)

        print(f"[Debug] Best: {records[best_idx]['student_name']} | Sim: {best_sim:.4f} | Conf: {confidence}%")

        THRESHOLD = 0.70
        if best_sim >= THRESHOLD:
            name = records[best_idx]["student_name"]
            # Mark attendance if not already marked
            if name not in session_marked:
                session_marked.add(name)
                now = datetime.now()
                supabase.table("attendance").insert({
                    "name": name,
                    "date": now.strftime("%Y-%m-%d"),
                    "time": now.strftime("%H:%M:%S")
                }).execute()
                print(f"[Attendance] ✅ Marked: {name}")
        else:
            name       = "Unknown"
            confidence = round(best_sim * 100, 1)

    except Exception as e:
        print(f"[Error] {e}")
        name, confidence = "Unknown", 0.0

    return {
        "name":           name,
        "confidence":     confidence,
        "marked":         name in session_marked,
        "already_marked": name in session_marked,
        "session":        list(session_marked),
        "time":           datetime.now().strftime("%H:%M:%S"),
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.post("/recognize")
async def recognize(request: Request):
    content_type = request.headers.get("content-type", "")
    try:
        if "application/json" in content_type:
            body  = await request.json()
            frame = decode_base64_image(body.get("image", ""))
        else:
            form  = await request.form()
            file  = form.get("file") or form.get("image") or form.get("frame")
            if file is None:
                return {"error": "No image", "name": "Unknown", "confidence": 0.0}
            contents = await file.read()
            np_arr   = np.frombuffer(contents, np.uint8)
            frame    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"error": "Bad image", "name": "Unknown", "confidence": 0.0}
        return process_frame(frame)
    except Exception as e:
        return {"error": str(e), "name": "Unknown", "confidence": 0.0}


@app.post("/register/photo")
async def register_photo(request: Request):
    """Save photo and generate embedding → store in Supabase."""
    body  = await request.json()
    name  = body.get("name", "").strip().replace(" ", "_")
    image = body.get("image", "")

    if not name or not image:
        return {"error": "Name and image required"}

    frame = decode_base64_image(image)
    if frame is None:
        return {"error": "Could not decode image"}

    try:
        emb_obj = DeepFace.represent(
            img_path=frame,
            model_name="Facenet",
            enforce_detection=False
        )
        embedding = emb_obj[0]["embedding"]

        # Save embedding to Supabase
        supabase.table("encodings").insert({
            "student_name": name,
            "embedding":    embedding
        }).execute()

        # Count how many photos this student has
        count_res = supabase.table("encodings").select("id").eq("student_name", name).execute()
        count = len(count_res.data)

        print(f"[Register] Saved embedding {count} for '{name}'")
        return {
            "message": f"Photo {count} saved for {name}",
            "count":   count,
            "name":    name,
            "ready":   count >= 10
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/register/train")
async def register_train(request: Request):
    """For Supabase version - embeddings saved per photo, no separate training needed."""
    body = await request.json()
    name = body.get("name", "").strip().replace(" ", "_")
    count_res = supabase.table("encodings").select("id").eq("student_name", name).execute()
    count = len(count_res.data)
    return {
        "message":   f"'{name}' has {count} embeddings ready",
        "processed": count,
        "skipped":   0,
        "total_students": len(set([r["student_name"] for r in load_encodings_from_supabase()])),
        "total_encodings": len(load_encodings_from_supabase())
    }


@app.get("/students")
def get_students():
    records = load_encodings_from_supabase()
    counts  = {}
    for r in records:
        n = r["student_name"]
        counts[n] = counts.get(n, 0) + 1
    students = [{"name": k, "photos": v} for k, v in counts.items()]
    return {"students": students, "total": len(students)}


@app.get("/attendance")
def get_attendance():
    response = supabase.table("attendance").select("*").order("created_at", desc=True).execute()
    rows = [{"Name": r["name"], "Date": r["date"], "Time": r["time"]} for r in (response.data or [])]
    return {"attendance": rows, "total": len(rows)}


@app.get("/session")
def get_session():
    return {
        "present": list(session_marked),
        "count":   len(session_marked)
    }


@app.post("/reset")
def reset_session():
    session_marked.clear()
    return {"message": "Session reset successfully"}


@app.get("/")
def root():
    return {"status": "Face Attendance API running with Supabase ✅"}