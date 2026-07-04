"""
normalize.py — 原始抓取 JSON → 统一领域模型 Blogger / Content
mock 数据已是统一结构，真实抓取时在此做字段映射。
"""


def to_blogger(raw: dict) -> dict:
    # mock 已是目标结构
    if "contents" in raw:
        return {
            "id": raw["id"], "name": raw["name"], "avatar": raw.get("avatar", ""),
            "fans": raw.get("fans"), "domain": raw.get("domain"), "verified": raw.get("verified", ""),
            "bio": raw.get("bio", ""), "tags": raw.get("tags", []),
            "recentView": raw.get("recentView"),
            "contents": [to_content(c) for c in raw["contents"]],
        }
    # TODO 真实抓取映射：从 raw["_raw_info"] / raw["_raw_posts"] 提取
    info = (raw.get("_raw_info") or {}).get("user", {})
    posts = (raw.get("_raw_posts") or {}).get("aweme_list", [])
    return {
        "id": raw.get("id"),
        "name": info.get("nickname"),
        "avatar": (info.get("avatar_thumb") or {}).get("url_list", [""])[0],
        "fans": info.get("follower_count"),
        "domain": "",  # 需结合分类词表推断
        "bio": info.get("signature", ""),
        "tags": [],
        "contents": [to_content(p) for p in posts],
    }


def to_content(raw: dict) -> dict:
    if "view" in raw or "like" in raw:  # mock 结构
        return {
            "id": raw["id"], "type": raw.get("type", "video"), "title": raw.get("title", ""),
            "cover": raw.get("cover", ""), "author": raw.get("author", ""),
            "publishedAt": raw.get("publishedAt", ""),
            "view": raw.get("view"), "like": raw.get("like"), "collect": raw.get("collect"),
            "duration": raw.get("duration"), "images": raw.get("images"),
            "url": raw.get("url", ""),
        }
    # TODO 真实抓取映射
    stat = raw.get("statistics", {})
    return {
        "id": raw.get("aweme_id"),
        "type": "image" if raw.get("images") else "video",
        "title": raw.get("desc", ""),
        "cover": (raw.get("video", {}).get("cover", {}) or {}).get("url_list", [""])[0],
        "author": (raw.get("author") or {}).get("nickname", ""),
        "view": stat.get("play_count"), "like": stat.get("digg_count"),
        "collect": stat.get("collect_count"),
        "duration": (raw.get("video") or {}).get("duration"),
        "url": f"https://www.douyin.com/video/{raw.get('aweme_id')}",
    }
