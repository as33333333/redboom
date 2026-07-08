"""
db.py — SQLite database bootstrap and small query helpers.

The project starts with SQLite so local development can run without a
separate database service. Set DATABASE_URL=sqlite:////abs/path/app.db to
override the default backend/app.db location.
"""
import os
import sqlite3
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "database/schema.sql"
DEFAULT_DB = Path(__file__).resolve().parent / "app.db"
_LOCK = threading.Lock()


def database_path() -> Path:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return DEFAULT_DB
    if url.startswith("sqlite:///"):
        return Path(url.replace("sqlite:///", "", 1)).expanduser()
    if url.startswith("sqlite://"):
        return Path(url.replace("sqlite://", "", 1)).expanduser()
    raise ValueError("Only sqlite DATABASE_URL is supported in the current backend")


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _LOCK:
        with connect() as conn:
            conn.executescript(SCHEMA.read_text("utf-8"))
            conn.commit()


def query(sql: str, params: tuple = ()) -> list[dict]:
    with _LOCK:
        with connect() as conn:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]


def one(sql: str, params: tuple = ()) -> dict | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = ()) -> int:
    with _LOCK:
        with connect() as conn:
            cur = conn.execute(sql, params)
            conn.commit()
            return int(cur.lastrowid or 0)


def table_names() -> list[str]:
    rows = query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    return [r["name"] for r in rows]
