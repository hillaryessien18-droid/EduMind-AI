"""Thin wrapper around the OpenAI API.

* The API key stays on the server (settings.OPENAI_API_KEY).
* Timeouts and retries are configured on the client.
* Every call is logged to AIUsageLog with token counts and an estimated cost.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterator

from django.conf import settings

from tutor.models import AIUsageLog

logger = logging.getLogger(__name__)


class AIUnavailable(Exception):
    """Raised when the provider is not configured or fails."""


@dataclass
class StreamResult:
    text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    chunks: list[str] = field(default_factory=list)


def get_client():
    if not settings.OPENAI_API_KEY:
        raise AIUnavailable("The AI tutor isn't configured yet: set OPENAI_API_KEY on the server.")
    from openai import OpenAI

    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT_SECONDS,
        max_retries=settings.OPENAI_MAX_RETRIES,
    )


def estimate_cost(prompt_tokens: int, completion_tokens: int) -> Decimal:
    cost = (
        prompt_tokens * settings.OPENAI_INPUT_COST_PER_M
        + completion_tokens * settings.OPENAI_OUTPUT_COST_PER_M
    ) / 1_000_000
    return Decimal(str(round(cost, 6)))


def log_usage(user, feature: str, prompt_tokens=0, completion_tokens=0, success=True, error=""):
    AIUsageLog.objects.create(
        user=user, feature=feature, model=settings.OPENAI_MODEL,
        prompt_tokens=prompt_tokens, completion_tokens=completion_tokens,
        estimated_cost_usd=estimate_cost(prompt_tokens, completion_tokens),
        success=success, error=error[:200],
    )


def stream_chat(messages: list[dict], result: StreamResult) -> Iterator[str]:
    """Yield text deltas; fills `result` with the full text and token usage."""
    client = get_client()
    try:
        stream = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            stream=True,
            stream_options={"include_usage": True},
            temperature=0.4,
        )
        for chunk in stream:
            if getattr(chunk, "usage", None):
                result.prompt_tokens = chunk.usage.prompt_tokens or 0
                result.completion_tokens = chunk.usage.completion_tokens or 0
            if chunk.choices:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    result.text += delta
                    yield delta
    except AIUnavailable:
        raise
    except Exception as exc:  # provider/network errors
        logger.warning("AI provider error: %s", type(exc).__name__)
        raise AIUnavailable("The AI provider is unavailable right now. Please try again.") from exc
