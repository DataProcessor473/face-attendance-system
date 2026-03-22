# 🎓 Face Recognition Attendance System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![DeepFace](https://img.shields.io/badge/DeepFace-FaceNet-orange?style=for-the-badge)
![OpenCV](https://img.shields.io/badge/OpenCV-4.x-green?style=for-the-badge&logo=opencv)
![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

**An AI-powered automatic attendance marking system using real-time face recognition.**  
Built with FaceNet embeddings, OpenCV, and DeepFace — no manual entry required.

</div>

---

## 📸 Demo

> Camera detects faces → Matches against student database → Marks attendance in CSV automatically.

```
Student detected: Krishna Tate  |  Confidence: 91.3%  |  ✅ Attendance Marked
```

---

## ✨ Features

- 🔍 **Real-time face detection** using OpenCV Haar Cascade
- 🧠 **FaceNet embeddings** via DeepFace for high-accuracy recognition
- 📋 **Auto CSV attendance** with Name, Date, Time
- 🚫 **Duplicate prevention** — each student marked only once per session
- 👤 **Unknown face handling** — unrecognized faces labeled as `Unknown`
- ⚡ **Optimized pipeline** — processes every Nth frame for performance
- 📷 **Built-in photo collector** — capture student photos directly from webcam

---

## 🗂️ Project Structure

```
face-attendance-system/
│
├── collect_student_photos.py   # Capture student photos via webcam
├── encode_faces.py             # Build FaceNet embeddings from dataset
├── recognize_realtime.py       # Live face recognition + attendance marking
├── attendance.py               # CSV attendance logger module
├── requirements.txt            # Python dependencies
└── README.md
```

> **Note:** `dataset/`, `encodings.pkl`, and `attendance.csv` are excluded from the repo (see `.gitignore`) to protect student privacy.

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/DataProcessor473/face-attendance-system.git
cd face-attendance-system
```

### 2. Create and activate conda environment
```bash
conda create -n attendance python=3.11 -y
conda activate attendance
```

### 3. Install dependencies
```bash
pip install deepface opencv-python imutils numpy
pip install https://github.com/z-mahmud22/Dlib_Windows_Python3.x/raw/main/dlib-19.24.1-cp311-cp311-win_amd64.whl
pip install face-recognition
```

---

## 🚀 Usage

### Step 1 — Collect student photos
```bash
python collect_student_photos.py
```
- Enter student name when prompted
- Press `SPACE` to capture (recommended: 10–15 photos per student)
- Press `Q` when done

### Step 2 — Build face encodings
```bash
python encode_faces.py
```
Generates `encodings.pkl` with FaceNet embeddings for all students.

### Step 3 — Start live attendance
```bash
python recognize_realtime.py
```
| Key | Action |
|-----|--------|
| `Q` | Quit |
| `S` | Print session attendance list in terminal |

---

## 📊 CSV Output

Attendance is automatically saved to `attendance.csv`:

```csv
Name,Date,Time
Krishna_Tate,2026-03-22,09:03:12
Rohit_Sharma,2026-03-22,09:04:45
Priya_Patil,2026-03-22,09:06:21
```

- ✅ File is created automatically if it doesn't exist
- ✅ Appends to existing file on subsequent runs
- ✅ No duplicate entries within the same session

---

## 🧠 How It Works

```
Webcam Frame
     │
     ▼
Face Detection (OpenCV Haar Cascade)
     │
     ▼
Face Embedding (FaceNet via DeepFace) → 128-d vector
     │
     ▼
Cosine Similarity vs Known Encodings
     │
     ├── Similarity > 0.6 → ✅ Recognized → Mark Attendance
     └── Similarity ≤ 0.6 → ❌ Unknown
```

---

## 🔧 Configuration

Edit these variables in `recognize_realtime.py`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `PROCESS_EVERY_N` | `5` | Process every Nth frame (higher = faster) |
| `cosine threshold` | `0.6` | Recognition confidence threshold |
| `VIDEO_SOURCE` | `0` | `0` = webcam, or path to video file |

---

## 📦 Dependencies

| Library | Purpose |
|---------|---------|
| `deepface` | FaceNet embeddings |
| `opencv-python` | Webcam capture + face detection |
| `dlib` | Face recognition backbone |
| `face-recognition` | Encoding utilities |
| `numpy` | Vector operations |
| `imutils` | Image path utilities |

---

## 🛡️ Privacy

- Student photos are stored **locally only** and excluded from this repository
- No data is sent to any external server
- All processing happens **on-device** in real-time

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Krishna Tate**  
[![GitHub](https://img.shields.io/badge/GitHub-DataProcessor473-black?style=flat&logo=github)](https://github.com/DataProcessor473)

---

<div align="center">
⭐ Star this repo if you found it useful!
</div>
