import logging
import subprocess
from datetime import date, datetime, timedelta

from database import Activity, SessionLocal

logger = logging.getLogger(__name__)


def _run_osascript(script: str) -> str | None:
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def _fetch_inbox_emails(target_date: date) -> list[dict]:
    """Fetch received emails from Mail.app for a given date."""
    date_str = target_date.strftime("%m/%d/%Y")

    script = f'''
    set output to ""
    tell application "Mail"
        set targetDate to date "{date_str}"
        set msgs to (every message of inbox whose date received >= targetDate and date received < (targetDate + 1 * days))
        repeat with msg in msgs
            set subj to subject of msg
            set sndr to sender of msg
            set recvDate to date received of msg
            set output to output & subj & "||" & sndr & "||" & (recvDate as string) & "||received" & linefeed
        end repeat
    end tell
    return output
    '''
    return _parse_mail_output(_run_osascript(script))


def _fetch_sent_emails(target_date: date) -> list[dict]:
    """Fetch sent emails from Mail.app for a given date."""
    date_str = target_date.strftime("%m/%d/%Y")

    script = f'''
    set output to ""
    tell application "Mail"
        set targetDate to date "{date_str}"
        set sentBox to sent mailbox
        set msgs to (every message of sentBox whose date sent >= targetDate and date sent < (targetDate + 1 * days))
        repeat with msg in msgs
            set subj to subject of msg
            set recipList to ""
            repeat with recip in (every to recipient of msg)
                set recipList to recipList & (address of recip) & ","
            end repeat
            set sentDate to date sent of msg
            set output to output & subj & "||" & recipList & "||" & (sentDate as string) & "||sent" & linefeed
        end repeat
    end tell
    return output
    '''
    return _parse_mail_output(_run_osascript(script))


def _parse_mail_output(raw: str | None) -> list[dict]:
    if not raw:
        return []

    emails = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("||")
        if len(parts) < 4:
            continue
        emails.append({
            "subject": parts[0].strip(),
            "contact": parts[1].strip(),  # sender or recipients
            "date": parts[2].strip(),
            "direction": parts[3].strip(),
        })
    return emails


def _parse_datetime(dt_str: str) -> datetime:
    for fmt in (
        "%A, %B %d, %Y at %I:%M:%S %p",
        "%m/%d/%Y %I:%M:%S %p",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    from dateutil.parser import parse as dateutil_parse
    return dateutil_parse(dt_str)


def sync_emails(target_date: date | None = None) -> list[Activity]:
    """Sync emails from Apple Mail into the activities table."""
    target_date = target_date or date.today()

    raw_emails = _fetch_inbox_emails(target_date) + _fetch_sent_emails(target_date)
    if not raw_emails:
        logger.info("No emails found for %s", target_date)
        return []

    db = SessionLocal()
    created: list[Activity] = []
    try:
        for email in raw_emails:
            try:
                email_dt = _parse_datetime(email["date"])
            except Exception:
                logger.warning("Could not parse email date: %s", email["date"])
                continue

            # Assume ~2 min per email as an activity duration estimate
            end_time = email_dt + timedelta(minutes=2)

            # Deduplicate
            existing = (
                db.query(Activity)
                .filter(
                    Activity.activity_type == "email",
                    Activity.window_title == email["subject"],
                    Activity.start_time == email_dt,
                )
                .first()
            )
            if existing:
                continue

            metadata = {
                "direction": email["direction"],
                "contact": email["contact"],
            }

            activity = Activity(
                app_name="Mail",
                window_title=email["subject"],
                start_time=email_dt,
                end_time=end_time,
                duration_seconds=120.0,
                activity_type="email",
            )
            activity.extra_metadata = metadata
            db.add(activity)
            created.append(activity)

        db.commit()
        logger.info("Synced %d emails for %s", len(created), target_date)
    except Exception:
        db.rollback()
        logger.exception("Failed to sync emails")
        raise
    finally:
        db.close()

    return created
