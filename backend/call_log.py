import logging
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

from database import Activity, SessionLocal

logger = logging.getLogger(__name__)

CALL_HISTORY_DB = Path.home() / "Library" / "Application Support" / "CallHistoryDB" / "CallHistory.storedata"


def _read_call_history(target_date: date) -> list[dict]:
    """Read call records from the macOS CallHistory SQLite database.

    The database stores timestamps as CoreData / NSDate epoch
    (seconds since 2001-01-01 00:00:00 UTC).
    """
    if not CALL_HISTORY_DB.exists():
        logger.info("CallHistory database not found at %s", CALL_HISTORY_DB)
        return []

    epoch_2001 = datetime(2001, 1, 1)
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    start_stamp = (day_start - epoch_2001).total_seconds()
    end_stamp = (day_end - epoch_2001).total_seconds()

    calls: list[dict] = []
    try:
        conn = sqlite3.connect(f"file:{CALL_HISTORY_DB}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # ZCALLRECORD schema may vary across macOS versions; try common columns
        cursor.execute("""
            SELECT
                ZADDRESS,
                ZDURATION,
                ZDATE,
                ZORIGINATED,
                ZANSWERED,
                ZCALLTYPE
            FROM ZCALLRECORD
            WHERE ZDATE >= ? AND ZDATE < ?
            ORDER BY ZDATE
        """, (start_stamp, end_stamp))

        for row in cursor.fetchall():
            call_time = epoch_2001 + timedelta(seconds=row["ZDATE"])
            duration = row["ZDURATION"] or 0
            direction = "outgoing" if row["ZORIGINATED"] else "incoming"
            answered = bool(row["ZANSWERED"])

            calls.append({
                "address": row["ZADDRESS"] or "Unknown",
                "duration": float(duration),
                "timestamp": call_time,
                "direction": direction,
                "answered": answered,
                "call_type": row["ZCALLTYPE"],  # 1=phone, 8=FaceTime audio, 16=FaceTime video
            })

        conn.close()
    except sqlite3.OperationalError as e:
        logger.warning("Could not read CallHistory DB (may need Full Disk Access): %s", e)
    except Exception:
        logger.exception("Error reading call history")

    return calls


def _call_type_label(call_type: int | None) -> str:
    mapping = {1: "Phone", 8: "FaceTime Audio", 16: "FaceTime Video"}
    return mapping.get(call_type, "Call")


def sync_call_log(target_date: date | None = None) -> list[Activity]:
    """Sync macOS call history into the activities table."""
    target_date = target_date or date.today()

    raw_calls = _read_call_history(target_date)
    if not raw_calls:
        logger.info("No call records found for %s", target_date)
        return []

    db = SessionLocal()
    created: list[Activity] = []
    try:
        for call in raw_calls:
            start_time: datetime = call["timestamp"]
            duration = max(call["duration"], 0)
            end_time = start_time + timedelta(seconds=duration)

            title_parts = [
                call["direction"].capitalize(),
                _call_type_label(call["call_type"]),
                "-",
                call["address"],
            ]
            window_title = " ".join(title_parts)

            # Deduplicate
            existing = (
                db.query(Activity)
                .filter(
                    Activity.activity_type == "call",
                    Activity.start_time == start_time,
                    Activity.window_title == window_title,
                )
                .first()
            )
            if existing:
                continue

            metadata = {
                "address": call["address"],
                "direction": call["direction"],
                "answered": call["answered"],
                "call_type": _call_type_label(call["call_type"]),
            }

            activity = Activity(
                app_name="Phone",
                window_title=window_title,
                start_time=start_time,
                end_time=end_time,
                duration_seconds=duration,
                activity_type="call",
            )
            activity.extra_metadata = metadata
            db.add(activity)
            created.append(activity)

        db.commit()
        logger.info("Synced %d call records for %s", len(created), target_date)
    except Exception:
        db.rollback()
        logger.exception("Failed to sync call log")
        raise
    finally:
        db.close()

    return created
