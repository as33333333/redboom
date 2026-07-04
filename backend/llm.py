"""
llm.py — LLM 封装（可切换 DeepSeek / Qwen / OpenAI 协议）
配置环境变量：
    LLM_API_KEY   必填才启用真实分析
    LLM_BASE_URL  默认 https://api.deepseek.com
    LLM_MODEL     默认 deepseek-chat
未配置时 llm_available() 返回 False → 上层走 mock。
"""
import os
import json

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")


def llm_available() -> bool:
    return bool(LLM_API_KEY)


def complete_json(system_prompt: str, ctx: dict) -> dict:
    """要求模型输出结构化 JSON（结论 + evidence[] + confidence）。"""
    from openai import OpenAI
    client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)
    resp = client.chat.completions.create(
        model=LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(ctx, ensure_ascii=False)},
        ],
        temperature=0.4,
    )
    return json.loads(resp.choices[0].message.content)


def stream(system_prompt: str, user: str):
    """SSE 流式（前端逐段渲染用）。"""
    from openai import OpenAI
    client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)
    for chunk in client.chat.completions.create(
        model=LLM_MODEL, stream=True,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user}],
    ):
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
