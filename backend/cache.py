"""
cache.py — SQLite 轻量缓存（取数/分析结果 + 已保存项）
"""
import os
import json
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent / "cache.db"
_conn = sqlite3.connect(DB, check_same_thread=False)
_conn.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
_conn.execute("CREATE TABLE IF NOT EXISTS saved (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT)")
_conn.commit()


def mode() -> str:
    from douyin_client import _use_mock
    from llm import llm_available
    return f"douyin={'mock' if _use_mock() else 'live'}, llm={'live' if llm_available() else 'mock'}"


def get(key: str):
    row = _conn.execute("SELECT v FROM kv WHERE k=?", (key,)).fetchone()
    return json.loads(row[0]) if row else None


def set(key: str, val):
    _conn.execute("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", (key, json.dumps(val, ensure_ascii=False)))
    _conn.commit()


def save_item(payload: dict):
    _conn.execute("INSERT INTO saved (payload) VALUES (?)", (json.dumps(payload, ensure_ascii=False),))
    _conn.commit()
