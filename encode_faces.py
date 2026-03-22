import os
import pickle
import cv2
import numpy as np
from deepface import DeepFace
from imutils import paths

DATASET_PATH  = "dataset"
ENCODINGS_OUT = "encodings.pkl"

def encode_faces():
    image_paths = list(paths.list_images(DATASET_PATH))
    all_embeddings = []
    all_names = []

    print(f"Found {len(image_paths)} images\n")

    for i, img_path in enumerate(image_paths):
        name = img_path.split(os.sep)[-2]
        print(f"[{i+1}/{len(image_paths)}] {name} | {img_path}")

        try:
            # DeepFace uses FaceNet internally - no dlib needed
            embedding = DeepFace.represent(
                img_path=img_path,
                model_name="Facenet",
                enforce_detection=False  # won't crash if face not detected
            )
            all_embeddings.append(embedding[0]["embedding"])
            all_names.append(name)
            print(f"  ✅ Encoded")
        except Exception as e:
            print(f"  ⚠ Skipped: {e}")

    with open(ENCODINGS_OUT, "wb") as f:
        pickle.dump({"encodings": all_embeddings, "names": all_names}, f)

    print(f"\n✅ Saved {len(all_embeddings)} encodings for "
          f"{len(set(all_names))} students → '{ENCODINGS_OUT}'")

if __name__ == "__main__":
    encode_faces()