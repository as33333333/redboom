"""
douyin_client.py — 抖音数据获取（GitHub skill 封装）

第一版数据源：Evil0ctal/Douyin_TikTok_Download_API（自建服务）
  部署后设置环境变量 DOUYIN_API_BASE，例如 http://localhost:80
  典型接口：
    GET /api/douyin/web/fetch_user_post?sec_user_id=...   # 用户作品列表
    GET /api/douyin/web/fetch_one_video?aweme_id=...       # 单视频详情
  参考：https://github.com/Evil0ctal/Douyin_TikTok_Download_API

未配置 DOUYIN_API_BASE 时，回退读取 assets/mock/bloggers.json（骨架可运行）。
后续版本可接入 NanmiCoder/MediaCrawler（评论）、JoeanAmier/TikTokDownloader（热榜）。
"""
import os
import json
import re
import threading
import time
from pathlib import Path
import httpx

DOUYIN_API_BASE = os.getenv("DOUYIN_API_BASE", "").rstrip("/")
MIN_REQUEST_INTERVAL_SECONDS = float(os.getenv("DOUYIN_MIN_REQUEST_INTERVAL_SECONDS", "2.0"))
MAX_POSTS_PER_FETCH = int(os.getenv("DOUYIN_MAX_POSTS_PER_FETCH", "10"))
ROOT = Path(__file__).resolve().parent.parent
_MOCK = json.loads((ROOT / "assets/mock/bloggers.json").read_text("utf-8"))["bloggers"]
_LAST_REQUEST_AT = 0.0
_REQUEST_LOCK = threading.Lock()


def _use_mock() -> bool:
    return not DOUYIN_API_BASE


def live_available() -> bool:
    return bool(DOUYIN_API_BASE)


def list_bloggers():
    # 演示用；真实场景来自榜单/搜索
    return _MOCK


def fetch_blogger(url_or_id: str) -> dict:
    """拉取博主主页信息 + 作品列表。"""
    if _use_mock():
        return next((b for b in _MOCK if b["id"] == url_or_id), _MOCK[0])
    sec_uid = _extract_sec_uid(url_or_id)
    with httpx.Client(timeout=30, headers=_headers()) as c:
        info = _get_json(c, "/api/douyin/web/handler_user_profile", {"sec_user_id": sec_uid})
        posts = _get_json(
            c,
            "/api/douyin/web/fetch_user_post_videos",
            {"sec_user_id": sec_uid, "max_cursor": 0, "count": MAX_POSTS_PER_FETCH},
        )
    return {"_raw_info": info, "_raw_posts": posts, "id": sec_uid}


def fetch_content(url_or_id: str) -> dict:
    """拉取单个作品详情。"""
    if _use_mock():
        for b in _MOCK:
            for c in b["contents"]:
                if c["id"] == url_or_id:
                    return {**c, "author": b["name"], "domain": b["domain"]}
        return _MOCK[0]["contents"][0]
    aweme_id = _extract_aweme_id(url_or_id)
    with httpx.Client(timeout=30, headers=_headers()) as c:
        return _get_json(c, "/api/douyin/web/fetch_one_video", {"aweme_id": aweme_id})


# --- 安全低频请求：不做绕风控模拟，只调用用户自建/授权的数据服务 ---
def _headers() -> dict:
    return {
        "Accept": "application/json",
        "User-Agent": "redboom-backend/0.1 (+https://github.com/as33333333/redboom)",
    }


def _get_json(client: httpx.Client, path: str, params: dict) -> dict:
    _throttle()
    resp = client.get(f"{DOUYIN_API_BASE}{path}", params=params)
    resp.raise_for_status()
    return resp.json()


def _throttle() -> None:
    global _LAST_REQUEST_AT
    with _REQUEST_LOCK:
        now = time.monotonic()
        wait = MIN_REQUEST_INTERVAL_SECONDS - (now - _LAST_REQUEST_AT)
        if wait > 0:
            time.sleep(wait)
        _LAST_REQUEST_AT = time.monotonic()


# --- 链接解析：仅提取显式 id，不解析短链跳转 ---
def _extract_sec_uid(url: str) -> str:
    text = (url or "").strip()
    m = re.search(r"sec_user_id=([^&#?/]+)", text)
    if m:
        return m.group(1)
    m = re.search(r"/user/([^/?#]+)", text)
    if m:
        return m.group(1)
    return text.rstrip("/").rsplit("/", 1)[-1]


def _extract_aweme_id(url: str) -> str:
    text = (url or "").strip()
    for pattern in (r"aweme_id=([0-9]+)", r"modal_id=([0-9]+)", r"/video/([0-9]+)", r"/note/([0-9]+)"):
        m = re.search(pattern, text)
        if m:
            return m.group(1)
    return text.rstrip("/").rsplit("/", 1)[-1]
