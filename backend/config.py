"""
LegalTimeTracker - Application Configuration

Reads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path


# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

_DB_PATH = Path(__file__).parent / "legaltimetracker.db"
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_DB_PATH}")

# ---------------------------------------------------------------------------
# Activity Tracker
# ---------------------------------------------------------------------------

# How often (in seconds) to poll the active window for changes.
TRACKER_INTERVAL_SECONDS: int = int(os.getenv("TRACKER_INTERVAL_SECONDS", "5"))

# Consecutive activities in the same app/window shorter than this threshold
# will be merged into a single activity record.
ACTIVITY_MERGE_THRESHOLD_SECONDS: int = int(
    os.getenv("ACTIVITY_MERGE_THRESHOLD_SECONDS", "30")
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", _default_origins).split(",")
    if origin.strip()
]
