# 自媒体工作台Agent（redboom）

面向 ToC 创作者的「内容分析 + 账号优化」工作台。第一版仅支持**抖音**。
三个模块：**爆款拆解 / 挖掘热点 / 对比分析**。

> 相关文档：`自媒体工作台Agent-前端设计方案.md`、`自媒体工作台Agent-全栈技术方案与MVP.md`

---

## 快速开始

### 方式一：纯前端（零依赖，打开即用）
前端自带 mock 数据，直接本地起一个静态服务器即可：

```bash
cd redboom
python3 -m http.server 5173
# 打开 http://localhost:5173
```
（直接双击 index.html 也能看，但 ES Module + fetch 建议用 http 方式。）

此模式下 `assets/js/api.js` 的 `API_BASE` 为空 → 全部走前端 mock，**爆款拆解可完整体验**（真实交互 + 示例数据）。

### 方式二：接后端（真实抖音数据 + LLM 分析）
```bash
cd redboom/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# 打开 http://localhost:8000
```
后端未配置抖音服务/LLM 时自动回退 mock，骨架照常运行。

要接真实数据：
1. **抖音取数**：部署 [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)，设 `DOUYIN_API_BASE`。
2. **AI 分析**：设 `LLM_API_KEY`（默认走 DeepSeek 协议，可切 Qwen/OpenAI）。
3. 前端把 `assets/js/api.js` 的 `API_BASE` 改为 `http://localhost:8000`。

或一键：`LLM_API_KEY=xxx docker compose up`。

---

## 目录
```
redboom/
├── index.html / discover.html / compare.html   三个模块页
├── assets/
│   ├── css/    theme(令牌) layout components
│   ├── js/     shell store format render api analyzer breakdown discover compare
│   └── mock/   bloggers / analysis / rank
└── backend/    FastAPI：main + douyin_client + normalize + metrics + analyzer + llm + cache + compare + prompts
```

---

## MVP 现状（1 天范围）
| 功能 | 状态 |
|---|---|
| 三页外壳 + 导航 + 对比篮（localStorage 跨页同步） | ✅ 真实 |
| 爆款拆解 · 博主主页 / 作品列表 / 单内容拆解引导 | ✅ 真实交互 |
| 分析器 · 数据分析（最多/最少/平均，格式化，暂无数据兜底） | ✅ 真实计算 |
| 分析器 · 内容分析 / 商业变现（两步 + 推测徽标 + 依据） | ✅ 结构真实，数据 mock/LLM |
| 挖掘热点 · 筛选联动 + 条件回显 | ✅ 真实；榜单为**示例数据** |
| 对比分析 · 四步流程 + 问题↔建议 | ✅ 流程真实；结论为**示例** |

标 `示例 / 待接入` 徽标的为后续版本（评论采集、抖音热榜、个人账号取数、赛道趋势、橱窗销量）。

---

## 合规提示
抖音数据获取工具仅用于学习研究，需自行处理 Cookie/风控与频率限制，遵守平台条款与数据合规；个人账号数据需授权。
