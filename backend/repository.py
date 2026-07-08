"""
repository.py — structured persistence for normalized domain objects.
"""
import json
from typing import Any

import db


def _json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def save_blogger(blogger: dict, raw: dict | None = None) -> None:
    db.execute(
        """
        INSERT INTO bloggers (
          id, platform, platform_user_id, name, avatar, fans, domain,
          tags_json, bio, verified, raw_json, fetched_at, updated_at
        )
        VALUES (?, 'douyin', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          avatar=excluded.avatar,
          fans=excluded.fans,
          domain=excluded.domain,
          tags_json=excluded.tags_json,
          bio=excluded.bio,
          verified=excluded.verified,
          raw_json=excluded.raw_json,
          fetched_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
            blogger.get("id"),
            blogger.get("id"),
            blogger.get("name") or "",
            blogger.get("avatar"),
            blogger.get("fans"),
            blogger.get("domain"),
            _json(blogger.get("tags", [])),
            blogger.get("bio"),
            blogger.get("verified"),
            _json(raw or blogger),
        ),
    )
    if blogger.get("id"):
        save_metric_snapshot("blogger", blogger["id"], fans=blogger.get("fans"), view_count=blogger.get("recentView"))
    for content in blogger.get("contents", []) or []:
        save_content(content, blogger_id=blogger.get("id"))


def save_content(content: dict, blogger_id: str | None = None, raw: dict | None = None) -> None:
    db.execute(
        """
        INSERT INTO contents (
          id, blogger_id, platform, platform_content_id, type, title, cover,
          url, author_name, published_at, duration, images, raw_json,
          fetched_at, updated_at
        )
        VALUES (?, ?, 'douyin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          blogger_id=COALESCE(excluded.blogger_id, contents.blogger_id),
          type=excluded.type,
          title=excluded.title,
          cover=excluded.cover,
          url=excluded.url,
          author_name=excluded.author_name,
          published_at=excluded.published_at,
          duration=excluded.duration,
          images=excluded.images,
          raw_json=excluded.raw_json,
          fetched_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
            content.get("id"),
            blogger_id,
            content.get("id"),
            content.get("type", "video"),
            content.get("title", ""),
            content.get("cover"),
            content.get("url"),
            content.get("author"),
            content.get("publishedAt"),
            content.get("duration"),
            content.get("images"),
            _json(raw or content),
        ),
    )
    if content.get("id"):
        save_metric_snapshot(
            "content",
            content["id"],
            view_count=content.get("view"),
            like_count=content.get("like"),
            collect_count=content.get("collect"),
        )


def save_metric_snapshot(
    target_type: str,
    target_id: str,
    fans: int | None = None,
    view_count: int | None = None,
    like_count: int | None = None,
    collect_count: int | None = None,
    comment_count: int | None = None,
    share_count: int | None = None,
) -> None:
    db.execute(
        """
        INSERT INTO metric_snapshots (
          target_type, target_id, fans, view_count, like_count,
          collect_count, comment_count, share_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(target_type, target_id, metric_date) DO UPDATE SET
          fans=excluded.fans,
          view_count=excluded.view_count,
          like_count=excluded.like_count,
          collect_count=excluded.collect_count,
          comment_count=excluded.comment_count,
          share_count=excluded.share_count
        """,
        (target_type, target_id, fans, view_count, like_count, collect_count, comment_count, share_count),
    )


def save_analysis(result: dict) -> None:
    target_type = result.get("targetType") or "blogger"
    obj = result.get("object") or {}
    target_id = obj.get("id")
    if not target_id:
        return
    confidence = None
    content = result.get("content") or {}
    if isinstance(content, dict):
        confidence = (content.get("positioning") or {}).get("confidence")
    db.execute(
        """
        INSERT INTO analyses (
          target_type, target_id, analysis_type, status, confidence,
          result_json, evidence_json, generated_at, updated_at
        )
        VALUES (?, ?, 'full', 'success', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(target_type, target_id, analysis_type) DO UPDATE SET
          status='success',
          confidence=excluded.confidence,
          result_json=excluded.result_json,
          evidence_json=excluded.evidence_json,
          generated_at=CURRENT_TIMESTAMP,
          updated_at=CURRENT_TIMESTAMP
        """,
        (target_type, target_id, confidence, _json(result), _json(_collect_evidence(result))),
    )


def _collect_evidence(result: dict) -> list:
    evidence = []
    monetize = result.get("monetize") or {}
    if isinstance(monetize, dict):
        evidence.extend(monetize.get("evidence") or [])
    return evidence


def save_item(payload: dict) -> int:
    return db.execute(
        """
        INSERT INTO saved_items (item_type, ref_type, ref_id, name, payload_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            payload.get("type") or payload.get("item_type") or "unknown",
            payload.get("refType") or payload.get("ref_type"),
            payload.get("refId") or payload.get("ref_id"),
            payload.get("name"),
            _json(payload),
        ),
    )


def list_saved(limit: int = 100) -> list[dict]:
    return db.query(
        """
        SELECT id, item_type, ref_type, ref_id, name, payload_json, created_at, updated_at
        FROM saved_items
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )


def delete_saved(item_id: int) -> bool:
    before = db.one("SELECT id FROM saved_items WHERE id=?", (item_id,))
    if not before:
        return False
    db.execute("DELETE FROM saved_items WHERE id=?", (item_id,))
    return True


def create_fetch_job(job_type: str, target_url: str, target_type: str | None = None) -> int:
    return db.execute(
        """
        INSERT INTO fetch_jobs (job_type, target_url, target_type, status)
        VALUES (?, ?, ?, 'running')
        """,
        (job_type, target_url, target_type),
    )


def finish_fetch_job(job_id: int, status: str, result: dict | None = None, error: str | None = None) -> None:
    db.execute(
        """
        UPDATE fetch_jobs
        SET status=?, result_json=?, error_message=?, finished_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        """,
        (status, _json(result or {}), error, job_id),
    )

