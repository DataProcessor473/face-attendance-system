"""
collect_student_photos.py
--------------------------
Run this ONCE per student to collect their photos via webcam.
Saves images to:  dataset/StudentName/1.jpg, 2.jpg, ...

Usage:
    python collect_student_photos.py
    → Enter student name when prompted
    → Press SPACE to capture a photo
    → Press Q when done (or auto-stops after NUM_PHOTOS)
"""

import cv2
import os

# ── Config ────────────────────────────────────────────────────────────────────
NUM_PHOTOS   = 15          # photos to collect per student
DATASET_PATH = "dataset"   # root folder
IMG_SIZE     = (224, 224)  # resize before saving
# ─────────────────────────────────────────────────────────────────────────────


def collect(student_name: str):
    save_dir = os.path.join(DATASET_PATH, student_name)
    os.makedirs(save_dir, exist_ok=True)

    # Find next available index (so re-runs don't overwrite)
    existing = len(os.listdir(save_dir))
    count = existing

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam.")

    print(f"\n[Collecting] Student: {student_name}")
    print(f"[Info] SPACE = capture | Q = quit | Target: {NUM_PHOTOS} photos\n")

    while count - existing < NUM_PHOTOS:
        ret, frame = cap.read()
        if not ret:
            break

        # Mirror for natural feel
        frame = cv2.flip(frame, 1)

        # Overlay instructions
        captured_this_session = count - existing
        cv2.putText(frame, f"Student: {student_name}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(frame, f"Captured: {captured_this_session}/{NUM_PHOTOS}", (10, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        cv2.putText(frame, "SPACE=capture  Q=quit", (10, frame.shape[0] - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("Collect Student Photos", frame)

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break

        elif key == ord(" "):
            count += 1
            img_resized = cv2.resize(frame, IMG_SIZE)
            path = os.path.join(save_dir, f"{count}.jpg")
            cv2.imwrite(path, img_resized)
            print(f"  ✅ Saved: {path}")

            # Flash effect
            white = frame.copy()
            white[:] = (255, 255, 255)
            cv2.imshow("Collect Student Photos", white)
            cv2.waitKey(100)

    cap.release()
    cv2.destroyAllWindows()
    total = count - existing
    print(f"\n[Done] {total} photos saved for '{student_name}' → {save_dir}/")
    return total


def main():
    print("=== Student Photo Collection ===")
    print(f"Photos will be saved to '{DATASET_PATH}/<StudentName>/'\n")

    while True:
        name = input("Enter student name (or 'done' to finish): ").strip()
        if name.lower() == "done" or not name:
            break

        # Sanitize name for folder
        safe_name = name.replace(" ", "_")
        collected = collect(safe_name)

        if collected < 5:
            print(f"⚠ Warning: only {collected} photos. Recommend at least 5 for accuracy.")

        another = input("\nAdd another student? (y/n): ").strip().lower()
        if another != "y":
            break

    print("\n=== Collection Complete ===")
    print("Next step: run  python encode_faces.py")


if __name__ == "__main__":
    main()
