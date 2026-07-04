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
from pathlib import Path
import httpx

DOUYIN_API_BASE = os.getenv("DOUYIN_API_BASE", "").rstrip("/")
ROOT = Path(__file__).resolve().parent.parent
_MOCK = json.loads((ROOT / "assets/mock/bloggers.json").read_text("utf-8"))["bloggers"]


def _use_mock() -> bool:
    return not DOUYIN_API_BASE


def list_bloggers():
    # 演示用；真实场景来自榜单/搜索
    return _MOCK


def fetch_blogger(url_or_id: str) -> dict:
    """拉取博主主页信息 + 作品列表。"""
    if _use_mock():
        return next((b for b in _MOCK if b["id"] == url_or_id), _MOCK[0])
    sec_uid = _extract_sec_uid(url_or_id)
    with httpx.Client(timeout=20) as c:
        info = c.get(f"{DOUYIN_API_BASE}/api/douyin/web/handler_user_profile",
                     params={"sec_user_id": sec_uid}).json()
        posts = c.get(f"{DOUYIN_API_BASE}/api/douyin/web/fetch_user_post_videos",
                      params={"sec_user_id": sec_uid, "max_cursor": 0, "count": 20}).json()
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
    with httpx.Client(timeout=20) as c:
        return c.get(f"{DOUYIN_API_BASE}/api/douyin/web/fetch_one_video",
                     params={"aweme_id": aweme_id}).json()


# --- 链接解析（真实实现时补全短链跳转/正则） ---
def _extract_sec_uid(url: str) -> str:
    return url.rsplit("/", 1)[-1]


def _extract_aweme_id(url: str) -> str:
    return url.rsplit("/", 1)[-1]
