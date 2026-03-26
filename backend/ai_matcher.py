"""AI-powered matching: links captured activities to clients and suggests time entries.

Uses the Anthropic Python SDK with Claude to perform intelligent matching based on
document names, email subjects, calendar events, call logs, and browser activity.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import datetime
from typing import Any

from database import Activity, Client

logger = logging.getLogger(__name__)

_MODEL = "claude-sonnet-4-20250514"
_MAX_RETRIES = 3
_INITIAL_BACKOFF_S = 1.0
_CONFIDENCE_THRESHOLD = 0.3


# ---------------------------------------------------------------------------
# Anthropic client helpers
# ---------------------------------------------------------------------------

def _get_anthropic_client():
    """Construct an Anthropic client, returning None if the key is missing."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set -- AI features disabled")
        return None

    try:
        from anthropic import Anthropic
        return Anthropic()
    except Exception:
        logger.exception("Failed to initialise Anthropic client")
        return None


def _call_claude(system_prompt: str, user_prompt: str, *, max_tokens: int = 4096) -> str | None:
    """Send a request to Claude with exponential-backoff retries."""
    client = _get_anthropic_client()
    if client is None:
        return None

    from anthropic import APIStatusError, RateLimitError

    backoff = _INITIAL_BACKOFF_S
    for attempt in range(_MAX_RETRIES):
        try:
            response = client.messages.create(
                model=_MODEL,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text

        except RateLimitError:
            if attempt == _MAX_RETRIES - 1:
                logger.error("Rate-limited after %d attempts", _MAX_RETRIES)
                return None
            logger.warning("Rate-limited, backing off %.1fs", backoff)
            time.sleep(backoff)
            backoff *= 2

        except APIStatusError as exc:
            logger.error("Claude API error (status=%s): %s", exc.status_code, exc.message)
            return None

        except Exception:
            logger.exception("Unexpected error calling Claude API")
            return None

    return None


def _extract_json(text: str) -> Any:
    """Extract JSON from Claude's response, handling markdown fences and wrapping."""
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Markdown code fence
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Find first JSON structure
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue

    logger.warning("Could not extract JSON from Claude response")
    return None


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

def _serialize_activity(a: Activity) -> dict:
    return {
        "id": a.id,
        "app": a.app_name,
        "title": a.window_title,
        "type": a.activity_type,
        "start": a.start_time.isoformat(),
        "end": a.end_time.isoformat(),
        "duration_seconds": a.duration_seconds,
        "metadata": a.extra_metadata,
    }


def _serialize_client(c: Client) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "keywords": c.keywords,
    }


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


# ---------------------------------------------------------------------------
# Activity -> Client matching
# ---------------------------------------------------------------------------

def match_activities_to_clients(
    activities: list[Activity],
    clients: list[Client],
) -> list[dict]:
    """Match activities to clients using Claude.

    Returns list of dicts: {activity_id, client_id, confidence, reason}.
    """
    if not activities or not clients:
        return []

    system_prompt = (
        "You are an AI assistant that helps lawyers match their computer "
        "activities to the correct client. Given tracked activities and a "
        "list of clients with keywords, determine which activity belongs "
        "to which client.\n\n"
        "Consider:\n"
        "  - Document filenames containing client names or matter references\n"
        "  - Email subjects/senders matching client contacts\n"
        "  - Calendar events mentioning client names or related parties\n"
        "  - Call logs from client phone numbers\n"
        "  - Browser research related to client matters\n"
        "  - Keyword overlap between activity content and client keywords\n\n"
        "Respond ONLY with a JSON array. Each element:\n"
        '  {"activity_id": <int>, "client_id": <int>, '
        '"confidence": <float 0-1>, "reason": "<brief>"}\n\n'
        "Only include matches with confidence >= 0.3. "
        "Omit activities that don't match any client. "
        "Output valid JSON only."
    )

    user_prompt = (
        "## Activities\n"
        f"```json\n{json.dumps([_serialize_activity(a) for a in activities], indent=2)}\n```\n\n"
        "## Clients\n"
        f"```json\n{json.dumps([_serialize_client(c) for c in clients], indent=2)}\n```"
    )

    logger.info("Requesting AI matching (%d activities, %d clients)", len(activities), len(clients))

    raw = _call_claude(system_prompt, user_prompt)
    if raw is None:
        return []

    parsed = _extract_json(raw)
    if parsed is None:
        return []

    # Handle wrapper objects
    if isinstance(parsed, dict):
        for key in ("matches", "results", "data"):
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break
        else:
            return []

    if not isinstance(parsed, list):
        return []

    valid_activity_ids = {a.id for a in activities}
    valid_client_ids = {c.id for c in clients}
    results = []

    for item in parsed:
        try:
            aid = int(item["activity_id"])
            cid = int(item["client_id"])
            conf = _clamp(float(item["confidence"]))
            reason = str(item.get("reason", ""))
        except (KeyError, ValueError, TypeError):
            continue

        if aid not in valid_activity_ids or cid not in valid_client_ids:
            continue
        if conf < _CONFIDENCE_THRESHOLD:
            continue

        results.append({
            "activity_id": aid,
            "client_id": cid,
            "confidence": round(conf, 3),
            "reason": reason,
        })

    logger.info("Matched %d activities to clients", len(results))
    return results


# ---------------------------------------------------------------------------
# AI-suggested time entries
# ---------------------------------------------------------------------------

def suggest_time_entries(
    activities: list[Activity],
    clients: list[Client],
) -> list[dict]:
    """Suggest consolidated billable time entries from raw activities."""
    if not activities:
        return []

    system_prompt = (
        "You are a legal billing assistant. Given a lawyer's computer "
        "activities and their client list, suggest consolidated time entries.\n\n"
        "Guidelines:\n"
        "  1. Group related activities into logical work blocks\n"
        "  2. Assign each block to the most likely client\n"
        "  3. Round durations to 6-minute (360s) increments (standard legal billing)\n"
        "  4. Write professional billing descriptions\n"
        "  5. Set matter_id to null unless clearly determinable\n\n"
        "Respond ONLY with a JSON array. Each element:\n"
        '  {"client_id": <int>, "matter_id": <int|null>, '
        '"description": "<str>", "start_time": "<ISO>", '
        '"end_time": "<ISO>", "duration_seconds": <float>, '
        '"confidence": <float 0-1>, "reasoning": "<str>"}\n\n'
        "Output valid JSON only."
    )

    user_prompt = (
        "## Activities\n"
        f"```json\n{json.dumps([_serialize_activity(a) for a in activities], indent=2)}\n```\n\n"
        "## Clients\n"
        f"```json\n{json.dumps([_serialize_client(c) for c in clients], indent=2)}\n```"
    )

    logger.info("Requesting time entry suggestions (%d activities, %d clients)", len(activities), len(clients))

    raw = _call_claude(system_prompt, user_prompt)
    if raw is None:
        return []

    parsed = _extract_json(raw)
    if parsed is None:
        return []

    if isinstance(parsed, dict):
        for key in ("suggestions", "entries", "time_entries", "data"):
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break
        else:
            return []

    if not isinstance(parsed, list):
        return []

    valid_client_ids = {c.id for c in clients}
    results = []

    for item in parsed:
        try:
            cid = int(item["client_id"])
            if cid not in valid_client_ids:
                continue
            mid = item.get("matter_id")
            mid = int(mid) if mid is not None else None
            desc = str(item.get("description", ""))
            st = item.get("start_time", "")
            et = item.get("end_time", "")
            dur = max(float(item.get("duration_seconds", 360)), 360.0)
            dur = round(dur / 360.0) * 360.0
            conf = _clamp(float(item.get("confidence", 0.5)))
            reasoning = str(item.get("reasoning", ""))
        except (KeyError, ValueError, TypeError):
            continue

        results.append({
            "client_id": cid,
            "matter_id": mid,
            "description": desc,
            "start_time": st,
            "end_time": et,
            "duration_seconds": dur,
            "confidence": round(conf, 3),
            "reasoning": reasoning,
        })

    logger.info("Generated %d time entry suggestions", len(results))
    return results
