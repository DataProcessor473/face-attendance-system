"""
api.py - Full version with student registration + live retraining
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import pickle
import csv
import os
import base64
from deepface import DeepFace
from attendance import AttendanceLogger
from datetime import datetime

app = FastAPI(title="Face Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ENCODINGS_FILE = "encodings.pkl"
DATASET_PATH   = "dataset"

# ── Load encodings ────────────────────────────────────────────────────────────
def load_encodings():
    global known_encodings, known_names
    if os.path.exists(ENCODINGS_FILE):
        with open(ENCODINGS_FILE, "rb") as f:
            data = pickle.load(f)
        known_encodings = [np.array(e, dtype=np.float64) for e in data["encodings"]]
        known_names     = data["names"]
    else:
        known_encodings = []
        known_names     = []
    print(f"✅ Loaded {len(known_encodings)} encodings for "
          f"{len(set(known_names))} students.")

load_encodings()
logger = AttendanceLogger()
# ─────────────────────────────────────────────────────────────────────────────


def cosine_similarity(a, b):
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


def process_frame(frame):
    try:
        emb_obj = DeepFace.represent(
            img_path=frame,
            model_name="Facenet",
            enforce_detection=False
        )
        emb  = np.array(emb_obj[0]["embedding"], dtype=np.float64)
        sims = [cosine_similarity(emb, k) for k in known_encodings]

        if not sims:
            return {"name": "Unknown", "confidence": 0.0, "marked": False,
                    "already_marked": False, "session": [], "time": datetime.now().strftime("%H:%M:%S")}

        best_idx   = int(np.argmax(sims))
        best_sim   = sims[best_idx]
        confidence = round(best_sim * 100, 1)

        print(f"[Debug] Best: {known_names[best_idx]} | Sim: {best_sim:.4f} | Conf: {confidence}%")

        THRESHOLD = 0.70
        if best_sim >= THRESHOLD:
            name = known_names[best_idx]
            logger.mark(name)
        else:
            name       = "Unknown"
            confidence = round(best_sim * 100, 1)

    except Exception as e:
        print(f"[Error] {e}")
        name, confidence = "Unknown", 0.0

    return {
        "name":           name,
        "confidence":     confidence,
        "marked":         logger.already_marked(name),
        "already_marked": logger.already_marked(name),
        "session":        logger.get_session_list(),
        "time":           datetime.now().strftime("%H:%M:%S"),
    }


# ── Recognition ───────────────────────────────────────────────────────────────
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


# ── Student Registration ───────────────────────────────────────────────────────
@app.post("/register/photo")
async def register_photo(request: Request):
    """
    Save a single photo for a student.
    Body: { "name": "John_Doe", "image": "data:image/jpeg;base64,..." }
    """
    body  = await request.json()
    name  = body.get("name", "").strip().replace(" ", "_")
    image = body.get("image", "")

    if not name or not image:
        return {"error": "Name and image required"}

    # Save to dataset folder
    save_dir = os.path.join(DATASET_PATH, name)
    os.makedirs(save_dir, exist_ok=True)

    frame = decode_base64_image(image)
    if frame is None:
        return {"error": "Could not decode image"}

    # Auto-increment photo index
    existing = len([f for f in os.listdir(save_dir) if f.endswith(".jpg")])
    save_path = os.path.join(save_dir, f"{existing + 1}.jpg")
    cv2.imwrite(save_path, frame)

    count = existing + 1
    print(f"[Register] Saved photo {count} for '{name}' → {save_path}")

    return {
        "message": f"Photo {count} saved for {name}",
        "count":   count,
        "name":    name,
        "ready":   count >= 10   # suggest training after 10 photos
    }


@app.post("/register/train")
async def register_train(request: Request):
    """
    Build embeddings for a specific student (or all students).
    Body: { "name": "John_Doe" }  or  { "name": "all" }
    """
    body = await request.json()
    name = body.get("name", "all").strip().replace(" ", "_")

    # Decide which folders to process
    if name == "all":
        folders = [f for f in os.listdir(DATASET_PATH)
                   if os.path.isdir(os.path.join(DATASET_PATH, f))]
    else:
        folders = [name]

    new_encodings = []
    new_names     = []
    skipped       = 0
    processed     = 0

    for folder in folders:
        folder_path = os.path.join(DATASET_PATH, folder)
        if not os.path.isdir(folder_path):
            continue

        images = [f for f in os.listdir(folder_path) if f.endswith(".jpg")]
        print(f"[Train] Processing {folder} — {len(images)} images")

        for img_file in images:
            img_path = os.path.join(folder_path, img_file)
            try:
                frame = cv2.imread(img_path)
                if frame is None:
                    skipped += 1
                    continue

                emb_obj = DeepFace.represent(
                    img_path=frame,
                    model_name="Facenet",
                    enforce_detection=False
                )
                emb = np.array(emb_obj[0]["embedding"], dtype=np.float64)
                new_encodings.append(emb)
                new_names.append(folder)
                processed += 1

            except Exception as e:
                print(f"  ⚠ Skipped {img_file}: {e}")
                skipped += 1

    if not new_encodings:
        return {"error": "No faces found in images", "processed": 0}

    # If training specific student: merge with existing encodings
    if name != "all" and os.path.exists(ENCODINGS_FILE):
        with open(ENCODINGS_FILE, "rb") as f:
            existing_data = pickle.load(f)
        # Keep all encodings EXCEPT the student being retrained
        keep_enc  = [e for e, n in zip(existing_data["encodings"], existing_data["names"]) if n != name]
        keep_names = [n for n in existing_data["names"] if n != name]
        new_encodings = keep_enc + new_encodings
        new_names     = keep_names + new_names

    # Save updated encodings
    with open(ENCODINGS_FILE, "wb") as f:
        pickle.dump({"encodings": new_encodings, "names": new_names}, f)

    # Reload encodings into memory
    load_encodings()

    print(f"[Train] Done. {processed} embeddings built, {skipped} skipped.")
    return {
        "message":    f"Training complete for '{name}'",
        "processed":  processed,
        "skipped":    skipped,
        "total_students": len(set(known_names)),
        "total_encodings": len(known_encodings)
    }


@app.get("/students")
def get_students():
    students = []
    if os.path.exists(DATASET_PATH):
        for folder in os.listdir(DATASET_PATH):
            folder_path = os.path.join(DATASET_PATH, folder)
            if os.path.isdir(folder_path):
                photo_count = len([f for f in os.listdir(folder_path) if f.endswith(".jpg")])
                students.append({"name": folder, "photos": photo_count})
    return {"students": students, "total": len(students)}


@app.get("/attendance")
def get_attendance():
    rows = []
    if os.path.exists("attendance.csv"):
        with open("attendance.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
    return {"attendance": rows, "total": len(rows)}


@app.get("/session")
def get_session():
    return {
        "present": logger.get_session_list(),
        "count":   len(logger.get_session_list())
    }


@app.post("/reset")
def reset_session():
    logger._session_marked.clear()
    return {"message": "Session reset successfully"}


@app.get("/")
def root():
    return {"status": "Face Attendance API running ✅"}
