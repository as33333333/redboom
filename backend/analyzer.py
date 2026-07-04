"""
analyzer.py — 内容分析 + 商业变现（LLM 编排）
- 拼 prompt → 调 llm → 校验结构化输出（含 evidence / confidence）
- 未配置 LLM_API_KEY 时回退 mock/analysis.json，保证骨架可运行
"""
import json
from pathlib import Path
from llm import complete_json, llm_available

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = Path(__file__).resolve().parent / "prompts"
_MOCK_ANALYSIS = json.loads((ROOT / "assets/mock/analysis.json").read_text("utf-8"))
_CATEGORIES = json.loads((ROOT / "assets/mock/categories.json").read_text("utf-8")).get("primary", [])


def _mock(obj, target_type):
    base = _MOCK_ANALYSIS.get(obj.get("id")) or _MOCK_ANALYSIS["dy_homelife"]
    return {"content": base["content"], "monetize": base["monetize"]}


def analyze_content_and_money(obj: dict, posts: list, target_type: str) -> dict:
    if not llm_available():
        return _mock(obj, target_type)

    ctx = {
        "target_type": target_type,
        "name": obj.get("name") or obj.get("title"),
        "bio": obj.get("bio", ""),
        "domain": obj.get("domain", ""),
        "titles": [p.get("title") for p in posts][:20],
        "official_categories": _CATEGORIES,  # 定位分析须从该官方垂类集合中归类
    }
    content_prompt = (PROMPTS / "content.md").read_text("utf-8")
    money_prompt = (PROMPTS / "monetize.md").read_text("utf-8")

    content = complete_json(content_prompt, ctx)   # 期望 {positioning, titlePattern, ...}
    monetize = complete_json(money_prompt, ctx)     # 期望 {evidence:[], tags:[{confidence}]}
    return {"content": content, "monetize": monetize}
