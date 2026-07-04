"""
metrics.py — 数据分析（纯计算，不用 LLM）
博主维度：每项指标的 最多 / 最少 / 平均（最多、最少附标题+封面+跳转）
视频维度：当前内容的数值
"""
from statistics import mean


def _extreme(posts, key):
    valid = [p for p in posts if p.get(key) is not None]
    if not valid:
        return {"max": None, "min": None, "avg": None}
    mx = max(valid, key=lambda p: p[key])
    mn = min(valid, key=lambda p: p[key])
    pack = lambda p: {"value": p[key], "title": p.get("title", ""),
                      "cover": p.get("cover", ""), "url": p.get("url", "")}
    return {"max": pack(mx), "min": pack(mn), "avg": round(mean(p[key] for p in valid))}


def compute_data_metrics(obj: dict, posts: list, target_type: str) -> dict:
    if target_type == "content":
        c = posts[0] if posts else obj
        return {
            "fans": obj.get("fans"),
            "view": {"value": c.get("view")},
            "like": {"value": c.get("like")},
            "collect": {"value": c.get("collect")},
        }
    return {
        "fans": obj.get("fans"),
        "view": _extreme(posts, "view"),
        "like": _extreme(posts, "like"),
        "collect": _extreme(posts, "collect"),
    }
