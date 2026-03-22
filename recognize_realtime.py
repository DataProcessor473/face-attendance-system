import cv2
import pickle
import numpy as np
from deepface import DeepFace
from attendance import AttendanceLogger

ENCODINGS_FILE  = "encodings.pkl"
UNKNOWN_LABEL   = "Unknown"
VIDEO_SOURCE    = 0
PROCESS_EVERY_N = 5

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def load_encodings(path):
    with open(path, "rb") as f:
        data = pickle.load(f)
    print(f"Loaded {len(data['encodings'])} encodings for "
          f"{len(set(data['names']))} students.")
    return data["encodings"], data["names"]

def run():
    known_encodings, known_names = load_encodings(ENCODINGS_FILE)
    logger = AttendanceLogger()

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    cap = cv2.VideoCapture(VIDEO_SOURCE)
    print("Started. Press Q to quit, S to show session list.")

    frame_count  = 0
    last_results = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        if frame_count % PROCESS_EVERY_N == 0:
            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
            last_results = []

            for (x, y, w, h) in faces:
                face_crop = frame[y:y+h, x:x+w]

                try:
                    emb_obj = DeepFace.represent(
                        img_path=face_crop,
                        model_name="Facenet",
                        enforce_detection=False
                    )
                    emb = np.array(emb_obj[0]["embedding"])

                    sims = [cosine_similarity(emb, np.array(k))
                            for k in known_encodings]
                    best_idx   = int(np.argmax(sims))
                    best_sim   = sims[best_idx]
                    confidence = round(best_sim * 100, 1)

                    if best_sim > 0.6:
                        name = known_names[best_idx]
                    else:
                        name = UNKNOWN_LABEL
                        confidence = 0.0

                except Exception:
                    name, confidence = UNKNOWN_LABEL, 0.0

                last_results.append((name, confidence, (x, y, w, h)))

                if name != UNKNOWN_LABEL:
                    logger.mark(name)

        for (name, conf, (x, y, w, h)) in last_results:
            color = (0, 200, 0) if logger.already_marked(name) else (220, 150, 0)
            if name == UNKNOWN_LABEL:
                color = (0, 0, 220)
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            label = f"{name} {conf:.1f}%" if name != UNKNOWN_LABEL else UNKNOWN_LABEL
            cv2.putText(frame, label, (x, y-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.putText(frame, f"Marked: {len(logger.get_session_list())}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 255, 50), 2)
        cv2.imshow("Attendance System | Q=quit", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("s"):
            print(f"Session: {logger.get_session_list()}")

    cap.release()
    cv2.destroyAllWindows()
    print(f"Done. Attendance saved to attendance.csv")
    print(f"Present: {logger.get_session_list()}")

if __name__ == "__main__":
    run()