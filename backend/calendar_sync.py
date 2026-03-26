import json
import logging
import sqlite3
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path

from database import Activity, SessionLocal

logger = logging.getLogger(__name__)


def _run_osascript(script: str) -> str | None:
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def _fetch_events_via_applescript(target_date: date) -> list[dict]:
    """Primary method: read calendar events via AppleScript + Calendar.app."""
    date_str = target_date.strftime("%m/%d/%Y")
    next_day = target_date + timedelta(days=1)
    next_day_str = next_day.strftime("%m/%d/%Y")

    script = f'''
    set output to ""
    tell application "Calendar"
        repeat with cal in calendars
            set calName to name of cal
            set evts to (every event of cal whose start date >= date "{date_str}" and start date < date "{next_day_str}")
            repeat with evt in evts
                set evtTitle to summary of evt
                set evtStart to start date of evt
                set evtEnd to end date of evt
                set output to output & evtTitle & "||" & (evtStart as string) & "||" & (evtEnd as string) & "||" & calName & linefeed
            end repeat
        end repeat
    end tell
    return output
    '''

    raw = _run_osascript(script)
    if not raw:
        return []

    events = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("||")
        if len(parts) < 4:
            continue
        events.append({
            "title": parts[0].strip(),
            "start": parts[1].strip(),
            "end": parts[2].strip(),
            "calendar": parts[3].strip(),
        })
    return events


def _fetch_events_via_sqlite(target_date: date) -> list[dict]:
    """Fallback: read directly from Calendar's SQLite store."""
    calendar_dir = Path.home() / "Library" / "Calendars"
    if not calendar_dir.exists():
        logger.warning("Calendar directory not found at %s", calendar_dir)
        return []

    # macOS Calendar uses CoreData timestamp: seconds since 2001-01-01
    epoch_2001 = datetime(2001, 1, 1)
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    start_stamp = (day_start - epoch_2001).total_seconds()
    end_stamp = (day_end - epoch_2001).total_seconds()

    events = []
    for db_path in calendar_dir.rglob("*.caldav/*.sqlite"):
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT ZSUMMARY, ZSTARTDATE, ZENDDATE
                FROM ZCALENDARITEM
                WHERE ZSTARTDATE >= ? AND ZSTARTDATE < ?
                  AND ZSUMMARY IS NOT NULL
            """, (start_stamp, end_stamp))

            for row in cursor.fetchall():
                evt_start = epoch_2001 + timedelta(seconds=row["ZSTARTDATE"])
                evt_end_val = row["ZENDDATE"]
                evt_end = epoch_2001 + timedelta(seconds=evt_end_val) if evt_end_val else evt_start + timedelta(hours=1)
                events.append({
                    "title": row["ZSUMMARY"],
                    "start": evt_start.isoformat(),
                    "end": evt_end.isoformat(),
                    "calendar": db_path.parent.name,
                })
            conn.close()
        except Exception:
            logger.debug("Could not read calendar db %s", db_path, exc_info=True)

    return events


def _parse_datetime(dt_str: str) -> datetime:
    """Best-effort parse of datetime strings from AppleScript or ISO format."""
    for fmt in (
        "%A, %B %d, %Y at %I:%M:%S %p",
        "%m/%d/%Y %I:%M:%S %p",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    # Last resort
    from dateutil.parser import parse as dateutil_parse
    return dateutil_parse(dt_str)


def sync_calendar_events(target_date: date | None = None) -> list[Activity]:
    """Sync macOS calendar events into the activities table.

    Tries AppleScript first, falls back to direct SQLite read.
    Returns the list of Activity objects created.
    """
    target_date = target_date or date.today()

    raw_events = _fetch_events_via_applescript(target_date)
    if not raw_events:
        logger.info("AppleScript returned no events, trying SQLite fallback")
        raw_events = _fetch_events_via_sqlite(target_date)

    if not raw_events:
        logger.info("No calendar events found for %s", target_date)
        return []

    db = SessionLocal()
    created: list[Activity] = []
    try:
        for evt in raw_events:
            try:
                start = _parse_datetime(evt["start"])
                end = _parse_datetime(evt["end"])
            except Exception:
                logger.warning("Could not parse event dates: %s", evt)
                continue

            duration = max((end - start).total_seconds(), 0)

            # Deduplicate: skip if an identical calendar activity already exists
            existing = (
                db.query(Activity)
                .filter(
                    Activity.activity_type == "calendar",
                    Activity.window_title == evt["title"],
                    Activity.start_time == start,
                )
                .first()
            )
            if existing:
                continue

            metadata = {"calendar": evt.get("calendar", "")}

            activity = Activity(
                app_name="Calendar",
                window_title=evt["title"],
                start_time=start,
                end_time=end,
                duration_seconds=duration,
                activity_type="calendar",
            )
            activity.extra_metadata = metadata
            db.add(activity)
            created.append(activity)

        db.commit()
        logger.info("Synced %d calendar events for %s", len(created), target_date)
    except Exception:
        db.rollback()
        logger.exception("Failed to sync calendar events")
        raise
    finally:
        db.close()

    return created
