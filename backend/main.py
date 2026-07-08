"""
main.py — FastAPI 入口
- 提供 /api/* 接口，供纯 HTML 前端 fetch
- 未配置抖音数据服务 / LLM 时，自动回退 mock（保证骨架可运行）
- 同时托管前端静态文件（一条命令起全站）

运行：
    cd backend && pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
然后打开 http://localhost:8000
（前端 assets/js/api.js 的 API_BASE 置空时走前端 mock；置为本地址时走本后端）
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path

from douyin_client import fetch_blogger, list_bloggers, fetch_content, live_available
from normalize import to_blogger, to_content
from metrics import compute_data_metrics
from analyzer import analyze_content_and_money
from compare import build_compare
import cache
import db
import repository

ROOT = Path(__file__).resolve().parent.parent  # redboom/
app = FastAPI(title="自媒体工作台Agent API", version="0.1.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "platform": "douyin",
        "mode": cache.mode(),
        "database": str(db.database_path()),
        "tables": db.table_names(),
    }


@app.get("/api/db/health")
def db_health():
    db.init_db()
    return {"ok": True, "database": str(db.database_path()), "tables": db.table_names()}


@app.get("/api/categories")
def api_categories():
    """抖音官方向内容垂类词表（供领域筛选 + 定位分析集合）。"""
    import json
    return JSONResponse(json.loads((ROOT / "assets/mock/categories.json").read_text("utf-8")))


@app.get("/api/bloggers")
def api_bloggers():
    bloggers = [to_blogger(b) for b in list_bloggers()]
    for b in bloggers:
        repository.save_blogger(b)
    return {"bloggers": bloggers}


@app.get("/api/blogger")
def api_blogger(url: str = Query(..., description="抖音主页链接或博主ID")):
    raw = fetch_blogger(url)
    obj = to_blogger(raw)
    repository.save_blogger(obj, raw)
    return obj


@app.get("/api/content")
def api_content(url: str = Query(...)):
    raw = fetch_content(url)
    obj = to_content(raw)
    repository.save_content(obj, raw=raw)
    return obj


@app.get("/api/analyze")
def api_analyze(type: str = Query("blogger"), id: str = Query(...)):
    key = f"analyze:{type}:{id}"
    if (hit := cache.get(key)):
        return hit
    if type == "content":
        raw = fetch_content(id)
        obj = to_content(raw)
        posts = [obj]
    else:
        raw = fetch_blogger(id)
        obj = to_blogger(raw)
        posts = obj.get("contents", [])
    result = {
        "targetType": type,
        "object": {"id": obj.get("id"), "name": obj.get("name") or obj.get("title"),
                   "domain": obj.get("domain"), "fans": obj.get("fans")},
        "data": compute_data_metrics(obj, posts, type),
        **analyze_content_and_money(obj, posts, type),
    }
    repository.save_analysis(result)
    cache.set(key, result)
    return result


@app.get("/api/discover/rank")
def api_rank(scope: str = "overall", type: str = "content", metric: str = "like",
             range: str = "1d", domain: str = ""):
    # v1：抖音榜单聚合未接入 → 返回示例数据 + 标记
    import json
    data = json.loads((ROOT / "assets/mock/rank.json").read_text("utf-8"))
    return JSONResponse(data)


@app.post("/api/compare")
def api_compare(payload: dict):
    return build_compare(payload.get("bloggerId"), payload.get("accountId"))


@app.post("/api/saved")
def api_saved(payload: dict):
    cache.save_item(payload)
    item_id = repository.save_item(payload)
    return {"ok": True, "id": item_id}


@app.get("/api/saved")
def api_saved_list(limit: int = Query(100, ge=1, le=500)):
    return {"items": repository.list_saved(limit)}


@app.delete("/api/saved/{item_id}")
def api_saved_delete(item_id: int):
    return {"ok": repository.delete_saved(item_id)}


@app.post("/api/fetch/probe")
def api_fetch_probe(payload: dict):
    """一次性真实取数探测。

    仅在配置 DOUYIN_API_BASE 后启用。这里不做模拟真人点击或反风控绕过，
    只调用用户自建、低频节流的数据服务，并把结果落库。
    """
    if not live_available():
        return JSONResponse(
            {
                "ok": False,
                "reason": "DOUYIN_API_BASE is not configured",
                "next": "Run an authorized Douyin data service first, then set DOUYIN_API_BASE.",
            },
            status_code=400,
        )

    target_type = payload.get("targetType") or payload.get("type") or "blogger"
    target_url = payload.get("url") or payload.get("targetUrl") or payload.get("id")
    if target_type not in ("blogger", "content"):
        return JSONResponse({"ok": False, "reason": "targetType must be blogger or content"}, status_code=422)
    if not target_url:
        return JSONResponse({"ok": False, "reason": "url is required"}, status_code=422)

    job_id = repository.create_fetch_job("probe", target_url, target_type)
    try:
        if target_type == "content":
            raw = fetch_content(target_url)
            obj = to_content(raw)
            repository.save_content(obj, raw=raw)
        else:
            raw = fetch_blogger(target_url)
            obj = to_blogger(raw)
            repository.save_blogger(obj, raw=raw)
        result = {"ok": True, "jobId": job_id, "targetType": target_type, "object": obj}
        repository.finish_fetch_job(job_id, "success", result)
        return result
    except Exception as exc:
        repository.finish_fetch_job(job_id, "failed", error=str(exc))
        return JSONResponse({"ok": False, "jobId": job_id, "error": str(exc)}, status_code=502)


# 托管前端（放最后，避免覆盖 /api）
app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="static")
