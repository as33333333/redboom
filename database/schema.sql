-- redboom database schema (SQLite first, PostgreSQL-compatible shape where practical)
-- This file is the structured replacement path for backend/cache.py's temporary kv/saved tables.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bloggers (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'douyin',
  platform_user_id TEXT,
  sec_uid TEXT,
  name TEXT NOT NULL,
  avatar TEXT,
  fans INTEGER,
  domain TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  bio TEXT,
  verified TEXT,
  raw_json TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bloggers_platform_user
ON bloggers(platform, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_bloggers_domain
ON bloggers(domain);

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  blogger_id TEXT,
  platform TEXT NOT NULL DEFAULT 'douyin',
  platform_content_id TEXT,
  type TEXT NOT NULL DEFAULT 'video',
  title TEXT NOT NULL DEFAULT '',
  cover TEXT,
  url TEXT,
  author_name TEXT,
  published_at TEXT,
  duration INTEGER,
  images INTEGER,
  raw_json TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blogger_id) REFERENCES bloggers(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_platform_content
ON contents(platform, platform_content_id);

CREATE INDEX IF NOT EXISTS idx_contents_blogger_id
ON contents(blogger_id);

CREATE INDEX IF NOT EXISTS idx_contents_type
ON contents(type);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('blogger', 'content')),
  target_id TEXT NOT NULL,
  metric_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  fans INTEGER,
  view_count INTEGER,
  like_count INTEGER,
  collect_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  extra_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (target_type, target_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_target
ON metric_snapshots(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_date
ON metric_snapshots(metric_date);

CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('blogger', 'content')),
  target_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('data', 'content', 'money', 'full')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  result_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  model_name TEXT,
  prompt_version TEXT,
  error_message TEXT,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (target_type, target_id, analysis_type)
);

CREATE INDEX IF NOT EXISTS idx_analyses_target
ON analyses(target_type, target_id);

CREATE TABLE IF NOT EXISTS compare_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compare_type TEXT NOT NULL CHECK (compare_type IN ('blogger', 'content')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  title TEXT,
  result_json TEXT NOT NULL DEFAULT '{}',
  model_name TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compare_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compare_set_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('blogger', 'content')),
  target_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'selected',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compare_set_id) REFERENCES compare_sets(id) ON DELETE CASCADE,
  UNIQUE (compare_set_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_compare_items_set
ON compare_items(compare_set_id);

CREATE TABLE IF NOT EXISTS saved_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  name TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_items_type
ON saved_items(item_type);

CREATE TABLE IF NOT EXISTS fetch_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL,
  target_url TEXT,
  target_type TEXT CHECK (target_type IN ('blogger', 'content')),
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  result_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_fetch_jobs_status
ON fetch_jobs(status);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires
ON api_cache(expires_at);

