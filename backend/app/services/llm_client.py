# app/services/llm_client.py
import json

from openai import OpenAI

from app.config import settings

# Groq speaks the OpenAI protocol, just via a different base_url.
client = OpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """
You are a senior contract risk analyst. You analyze ONLY the clauses provided. 
You NEVER invent facts. If the provided clauses are insufficient to assess the risk, 
you must return risk_level "none" and explain that there is insufficient information.

You must respond with STRICT JSON only, matching this schema:
{
  "risk_level": "high" | "medium" | "low" | "none",
  "explanation": "Plain English explanation of the risk.",
  "suggested_fix": "Safer alternative wording, or null if none.",
  "confidence": 0.0 to 1.0
}
"""


def get_llm_risk_analysis(category: str, clauses_text: str) -> dict:
    """Send the retrieved clauses to the LLM and return its parsed JSON verdict.

    Raises on failure instead of returning a placeholder verdict: silently
    degrading to ``risk_level: "none"`` would store fake "no risk" findings and
    hide real problems (a decommissioned model once made every category look
    clean).
    """
    user_prompt = f"""
    Risk Category: {category}
    
    Relevant Clauses:
    {clauses_text}
    """

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.0,  # deterministic, focused output
        response_format={"type": "json_object"},  # force JSON mode
    )

    return json.loads(response.choices[0].message.content)

def stream_chat_response(question: str, context_clauses: str):
    """Streams the LLM response token by token for Q&A.

    Errors are raised, not yielded as text: a caught exception used to be
    streamed to the browser as if the model had said it, which made broken
    calls (e.g. a decommissioned model) look like real answers.
    """
    system_prompt = """
    You are a helpful legal AI assistant. Answer the user's question based ONLY on the 
    contract clauses provided below. If the answer is not in the clauses, say 
    "I cannot find the answer in the provided contract." Do not invent information.
    """

    user_prompt = f"""
    Contract Clauses:
    {context_clauses}
    
    User Question: {question}
    """

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        stream=True,
    )

    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content