import asyncio
import logging
import re
import subprocess
import time
from datetime import datetime

from database import Activity, SessionLocal

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5  # seconds

BROWSER_APPS = {"Safari", "Google Chrome", "Firefox", "Arc", "Microsoft Edge", "Brave Browser", "Opera"}
EMAIL_APPS = {"Mail", "Microsoft Outlook", "Spark", "Airmail"}
DOCUMENT_EXTENSIONS = {
    ".docx", ".doc", ".pdf", ".xlsx", ".xls", ".pptx", ".ppt",
    ".txt", ".rtf", ".pages", ".numbers", ".key",
}


def _run_osascript(script: str) -> str | None:
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def get_active_app() -> str | None:
    return _run_osascript(
        'tell application "System Events" to get name of first application process whose frontmost is true'
    )


def get_window_title() -> str | None:
    return _run_osascript(
        'tell application "System Events" to get name of front window of '
        "(first application process whose frontmost is true)"
    )


def classify_activity(app_name: str, window_title: str) -> str:
    if app_name in EMAIL_APPS:
        return "email"
    if app_name in BROWSER_APPS:
        return "browser"
    if _has_document_extension(window_title):
        return "document"
    return "app"


def _has_document_extension(title: str) -> bool:
    if not title:
        return False
    lower = title.lower()
    return any(ext in lower for ext in DOCUMENT_EXTENSIONS)


def extract_document_name(window_title: str) -> str | None:
    """Pull a filename from titles like 'Contract_Draft.docx - Microsoft Word'."""
    if not window_title:
        return None
    # Match "filename.ext" followed by optional separator and app name
    match = re.search(r"([\w\-. ]+\.(?:" + "|".join(e.lstrip(".") for e in DOCUMENT_EXTENSIONS) + r"))", window_title, re.IGNORECASE)
    return match.group(1).strip() if match else None


def extract_browser_info(window_title: str) -> dict:
    """Extract page title and possible URL from browser window titles."""
    if not window_title:
        return {}
    # Browser titles are typically "Page Title - Browser Name" or "Page Title"
    parts = window_title.rsplit(" - ", 1)
    return {"page_title": parts[0].strip()}


def build_metadata(app_name: str, window_title: str, activity_type: str) -> dict:
    meta: dict = {}
    if activity_type == "document":
        doc = extract_document_name(window_title)
        if doc:
            meta["document_name"] = doc
    elif activity_type == "browser":
        meta.update(extract_browser_info(window_title))
    return meta


class ActivityTracker:
    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None
        self._started_at: float | None = None
        self._activities_captured = 0

        # Current grouping state
        self._current_app: str | None = None
        self._current_title: str | None = None
        self._current_start: datetime | None = None

    @property
    def running(self) -> bool:
        return self._running

    @property
    def uptime_seconds(self) -> float | None:
        if self._started_at is None:
            return None
        return time.time() - self._started_at

    @property
    def activities_captured(self) -> int:
        return self._activities_captured

    def start(self):
        if self._running:
            return
        self._running = True
        self._started_at = time.time()
        self._task = asyncio.get_event_loop().create_task(self._poll_loop())
        logger.info("Activity tracker started")

    def stop(self):
        if not self._running:
            return
        self._running = False
        self._flush_current()
        if self._task:
            self._task.cancel()
            self._task = None
        self._started_at = None
        logger.info("Activity tracker stopped")

    async def _poll_loop(self):
        while self._running:
            try:
                self._capture()
            except Exception:
                logger.exception("Error during activity capture")
            await asyncio.sleep(POLL_INTERVAL)

    def _capture(self):
        app_name = get_active_app()
        if not app_name:
            return

        window_title = get_window_title() or ""

        # Same app + same window title -> extend the current group
        if app_name == self._current_app and window_title == self._current_title:
            return

        # Different activity detected -> flush the previous one
        self._flush_current()

        # Start a new group
        self._current_app = app_name
        self._current_title = window_title
        self._current_start = datetime.utcnow()

    def _flush_current(self):
        if not self._current_app or not self._current_start:
            return

        end_time = datetime.utcnow()
        duration = (end_time - self._current_start).total_seconds()

        # Skip very short activities (< 2 seconds, likely transient)
        if duration < 2:
            self._current_app = None
            self._current_title = None
            self._current_start = None
            return

        activity_type = classify_activity(self._current_app, self._current_title)
        metadata = build_metadata(self._current_app, self._current_title, activity_type)

        db = SessionLocal()
        try:
            activity = Activity(
                app_name=self._current_app,
                window_title=self._current_title,
                start_time=self._current_start,
                end_time=end_time,
                duration_seconds=duration,
                activity_type=activity_type,
            )
            activity.extra_metadata = metadata
            db.add(activity)
            db.commit()
            self._activities_captured += 1
            logger.debug("Captured: %s - %s (%.1fs)", self._current_app, self._current_title, duration)
        except Exception:
            db.rollback()
            logger.exception("Failed to save activity")
        finally:
            db.close()

        self._current_app = None
        self._current_title = None
        self._current_start = None


# Module-level singleton
tracker = ActivityTracker()
