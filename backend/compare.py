"""
compare.py — 对比分析（两账号 diff → 问题 → 建议）
v1 提供结构骨架；真实版接入个人账号取数 + LLM diff。
"""


def build_compare(blogger_id: str, account_id: str) -> dict:
    # v1 占位：返回结构完整、内容示例（前端已有示例渲染）
    return {
        "blogger": {"id": blogger_id},
        "account": {"id": account_id},
        "placeholder": True,
        "dimensions": {"data": [], "content": [], "money": []},
        "problems": [],
        "advice": {"positioning": [], "content": [], "business": []},
        "note": "真实对比计算为后续版本（需个人账号取数 + LLM diff）",
    }
