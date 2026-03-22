"""
attendance.py
-------------
Handles CSV attendance logging.
CSV columns: Name, Date, Time
Prevents duplicate entries per session.
"""

import csv
import os
from datetime import datetime

CSV_FILE = "attendance.csv"
CSV_HEADERS = ["Name", "Date", "Time"]


class AttendanceLogger:
    def __init__(self, csv_path: str = CSV_FILE):
        self.csv_path = csv_path
        self._session_marked: set[str] = set()   # tracks who's marked this run
        self._init_csv()

    def _init_csv(self):
        """Create CSV with headers if it doesn't exist."""
        if not os.path.exists(self.csv_path):
            with open(self.csv_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
                writer.writeheader()
            print(f"[Attendance] Created new CSV → '{self.csv_path}'")

    def mark(self, name: str) -> bool:
        """
        Mark attendance for `name`.
        Returns True if newly marked, False if already marked this session.
        """
        if name in self._session_marked:
            return False   # already marked, skip duplicate

        now = datetime.now()
        row = {
            "Name": name,
            "Date": now.strftime("%Y-%m-%d"),
            "Time": now.strftime("%H:%M:%S"),
        }

        with open(self.csv_path, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
            writer.writerow(row)

        self._session_marked.add(name)
        print(f"[Attendance] ✅ Marked: {name} at {row['Date']} {row['Time']}")
        return True

    def already_marked(self, name: str) -> bool:
        return name in self._session_marked

    def get_session_list(self) -> list[str]:
        return sorted(self._session_marked)
