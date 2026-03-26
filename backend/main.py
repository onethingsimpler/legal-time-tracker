import logging
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from activity_tracker import tracker
from ai_matcher import match_activities_to_clients, suggest_time_entries
from calendar_sync import sync_calendar_events
from call_log import sync_call_log
from database import (
    Activity,
    ActivityClientLink,
    Client,
    Matter,
    TimeEntry,
    get_db,
    init_db,
)
from email_sync import sync_emails
from models import (
    AIMatchRequest,
    AIMatchResult,
    AISuggestedEntry,
    AISuggestEntriesRequest,
    AISuggestEntriesResponse,
    ActivityListResponse,
    ActivityResponse,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    ClientDailySummary,
    DailySummaryResponse,
    MatterCreate,
    MatterResponse,
    MatterUpdate,
    SyncResponse,
    TimeEntryCreate,
    TimeEntryResponse,
    TimeEntryUpdate,
    TrackerStatusResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

def _auto_seed_if_empty():
    """Seed demo data if the database is empty."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Client).count() == 0:
            logger.info("Empty database detected — seeding demo data")
            db.close()
            from seed_data import seed
            seed()
        else:
            db.close()
    except Exception:
        db.close()
        logger.exception("Auto-seed failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _auto_seed_if_empty()
    logger.info("Database initialised")
    yield
    if tracker.running:
        tracker.stop()


app = FastAPI(
    title="LegalTimeTracker API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> date:
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD.")


def _activity_to_response(a: Activity) -> ActivityResponse:
    from models import ActivityClientLinkResponse
    links = []
    for link in a.client_links:
        links.append(ActivityClientLinkResponse(
            id=link.id,
            activity_id=link.activity_id,
            client_id=link.client_id,
            confidence=link.confidence,
            matched_by=link.matched_by,
            client=_client_to_response(link.client) if link.client else None,
        ))
    return ActivityResponse(
        id=a.id,
        app_name=a.app_name,
        window_title=a.window_title,
        start_time=a.start_time,
        end_time=a.end_time,
        duration_seconds=a.duration_seconds,
        activity_type=a.activity_type,
        metadata=a.extra_metadata,
        client_links=links,
    )


def _client_to_response(c: Client) -> ClientResponse:
    return ClientResponse(
        id=c.id,
        name=c.name,
        color=c.color,
        keywords=c.keywords,
        created_at=c.created_at,
    )


def _matter_to_response(m: Matter) -> MatterResponse:
    return MatterResponse(
        id=m.id,
        client_id=m.client_id,
        name=m.name,
        description=m.description,
        keywords=m.keywords,
        created_at=m.created_at,
    )


def _time_entry_to_response(te: TimeEntry) -> TimeEntryResponse:
    return TimeEntryResponse(
        id=te.id,
        client_id=te.client_id,
        matter_id=te.matter_id,
        description=te.description,
        start_time=te.start_time,
        end_time=te.end_time,
        duration_seconds=te.duration_seconds,
        source=te.source,
        status=te.status,
        client=_client_to_response(te.client) if te.client else None,
    )


def _get_activities_for_date(db: Session, target_date: date) -> list[Activity]:
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    return (
        db.query(Activity)
        .filter(Activity.start_time >= day_start, Activity.start_time < day_end)
        .order_by(Activity.start_time)
        .all()
    )


def _get_time_entries_for_date(db: Session, target_date: date) -> list[TimeEntry]:
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    return (
        db.query(TimeEntry)
        .filter(TimeEntry.start_time >= day_start, TimeEntry.start_time < day_end)
        .order_by(TimeEntry.start_time)
        .all()
    )


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

@app.get("/api/activities", response_model=ActivityListResponse)
def get_activities(date: str = Query(..., description="YYYY-MM-DD"), db: Session = Depends(get_db)):
    target = _parse_date(date)
    activities = _get_activities_for_date(db, target)
    responses = [_activity_to_response(a) for a in activities]
    total_duration = sum(a.duration_seconds for a in activities)
    return ActivityListResponse(
        date=date,
        total_activities=len(responses),
        total_duration_seconds=total_duration,
        activities=responses,
    )


@app.get("/api/activities/today", response_model=ActivityListResponse)
def get_today_activities(db: Session = Depends(get_db)):
    today = date.today()
    activities = _get_activities_for_date(db, today)
    responses = [_activity_to_response(a) for a in activities]
    total_duration = sum(a.duration_seconds for a in activities)
    return ActivityListResponse(
        date=today.isoformat(),
        total_activities=len(responses),
        total_duration_seconds=total_duration,
        activities=responses,
    )


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

@app.get("/api/clients", response_model=list[ClientResponse])
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.name).all()
    return [_client_to_response(c) for c in clients]


@app.post("/api/clients", response_model=ClientResponse, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    client = Client(name=body.name, color=body.color)
    client.keywords = body.keywords
    db.add(client)
    db.commit()
    db.refresh(client)
    return _client_to_response(client)


@app.put("/api/clients/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, body: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if body.name is not None:
        client.name = body.name
    if body.color is not None:
        client.color = body.color
    if body.keywords is not None:
        client.keywords = body.keywords
    db.commit()
    db.refresh(client)
    return _client_to_response(client)


@app.delete("/api/clients/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()


# ---------------------------------------------------------------------------
# Matters
# ---------------------------------------------------------------------------

@app.get("/api/matters", response_model=list[MatterResponse])
def list_matters(client_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Matter)
    if client_id is not None:
        query = query.filter(Matter.client_id == client_id)
    matters = query.order_by(Matter.name).all()
    return [_matter_to_response(m) for m in matters]


@app.post("/api/matters", response_model=MatterResponse, status_code=201)
def create_matter(body: MatterCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    matter = Matter(
        client_id=body.client_id,
        name=body.name,
        description=body.description,
    )
    matter.keywords = body.keywords
    db.add(matter)
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter)


@app.put("/api/matters/{matter_id}", response_model=MatterResponse)
def update_matter(matter_id: int, body: MatterUpdate, db: Session = Depends(get_db)):
    matter = db.query(Matter).filter(Matter.id == matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    if body.name is not None:
        matter.name = body.name
    if body.description is not None:
        matter.description = body.description
    if body.keywords is not None:
        matter.keywords = body.keywords
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter)


@app.delete("/api/matters/{matter_id}", status_code=204)
def delete_matter(matter_id: int, db: Session = Depends(get_db)):
    matter = db.query(Matter).filter(Matter.id == matter_id).first()
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    db.delete(matter)
    db.commit()


# ---------------------------------------------------------------------------
# Time Entries
# ---------------------------------------------------------------------------

@app.get("/api/time-entries", response_model=list[TimeEntryResponse])
def list_time_entries(date: str = Query(..., description="YYYY-MM-DD"), db: Session = Depends(get_db)):
    target = _parse_date(date)
    entries = _get_time_entries_for_date(db, target)
    return [_time_entry_to_response(te) for te in entries]


@app.post("/api/time-entries", response_model=TimeEntryResponse, status_code=201)
def create_time_entry(body: TimeEntryCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if body.matter_id is not None:
        matter = db.query(Matter).filter(Matter.id == body.matter_id).first()
        if not matter:
            raise HTTPException(status_code=404, detail="Matter not found")

    duration = body.duration_seconds
    if duration is None:
        duration = (body.end_time - body.start_time).total_seconds()

    entry = TimeEntry(
        client_id=body.client_id,
        matter_id=body.matter_id,
        description=body.description,
        start_time=body.start_time,
        end_time=body.end_time,
        duration_seconds=duration,
        source=body.source,
        status=body.status,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _time_entry_to_response(entry)


@app.put("/api/time-entries/{entry_id}", response_model=TimeEntryResponse)
def update_time_entry(entry_id: int, body: TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    if body.client_id is not None:
        client = db.query(Client).filter(Client.id == body.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        entry.client_id = body.client_id
    if body.matter_id is not None:
        entry.matter_id = body.matter_id
    if body.description is not None:
        entry.description = body.description
    if body.start_time is not None:
        entry.start_time = body.start_time
    if body.end_time is not None:
        entry.end_time = body.end_time
    if body.duration_seconds is not None:
        entry.duration_seconds = body.duration_seconds
    if body.status is not None:
        entry.status = body.status
    db.commit()
    db.refresh(entry)
    return _time_entry_to_response(entry)


@app.delete("/api/time-entries/{entry_id}", status_code=204)
def delete_time_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    db.delete(entry)
    db.commit()


# ---------------------------------------------------------------------------
# Daily Summary
# ---------------------------------------------------------------------------

@app.get("/api/daily-summary", response_model=DailySummaryResponse)
def get_daily_summary(date: str = Query(..., description="YYYY-MM-DD"), db: Session = Depends(get_db)):
    target = _parse_date(date)
    activities = _get_activities_for_date(db, target)
    entries = _get_time_entries_for_date(db, target)

    # Build per-client totals from confirmed time entries
    client_totals_map: dict[int, dict] = {}
    for te in entries:
        cid = te.client_id
        if cid not in client_totals_map:
            client_totals_map[cid] = {"client": te.client, "total_seconds": 0.0, "entry_count": 0}
        client_totals_map[cid]["total_seconds"] += te.duration_seconds
        client_totals_map[cid]["entry_count"] += 1

    client_totals = [
        ClientDailySummary(
            client=_client_to_response(v["client"]),
            total_seconds=v["total_seconds"],
            entry_count=v["entry_count"],
        )
        for v in client_totals_map.values()
        if v["client"] is not None
    ]

    total_tracked = sum(te.duration_seconds for te in entries)

    return DailySummaryResponse(
        date=date,
        activities=[_activity_to_response(a) for a in activities],
        time_entries=[_time_entry_to_response(te) for te in entries],
        client_totals=client_totals,
        total_tracked_seconds=total_tracked,
        total_billable_entries=len(entries),
    )


# ---------------------------------------------------------------------------
# AI endpoints
# ---------------------------------------------------------------------------

@app.post("/api/ai/match", response_model=list[AIMatchResult])
def run_ai_match(body: AIMatchRequest, db: Session = Depends(get_db)):
    target = _parse_date(body.date)
    activities = _get_activities_for_date(db, target)
    clients = db.query(Client).all()

    if not activities:
        return []
    if not clients:
        raise HTTPException(status_code=400, detail="No clients configured. Create clients first.")

    matches = match_activities_to_clients(activities, clients)

    # Persist to activity_client_links
    for m in matches:
        existing = (
            db.query(ActivityClientLink)
            .filter(
                ActivityClientLink.activity_id == m["activity_id"],
                ActivityClientLink.client_id == m["client_id"],
            )
            .first()
        )
        if existing:
            existing.confidence = m["confidence"]
            existing.matched_by = m["reason"]
        else:
            db.add(ActivityClientLink(
                activity_id=m["activity_id"],
                client_id=m["client_id"],
                confidence=m["confidence"],
                matched_by=m["reason"],
            ))

    db.commit()
    return [AIMatchResult(**m) for m in matches]


@app.post("/api/ai/suggest-entries", response_model=AISuggestEntriesResponse)
def suggest_entries(body: AISuggestEntriesRequest, db: Session = Depends(get_db)):
    target = _parse_date(body.date)
    activities = _get_activities_for_date(db, target)
    clients = db.query(Client).all()

    if not activities:
        return AISuggestEntriesResponse(date=body.date, suggestions=[])

    suggestions = suggest_time_entries(activities, clients)

    return AISuggestEntriesResponse(
        date=body.date,
        suggestions=[AISuggestedEntry(**s) for s in suggestions],
    )


# ---------------------------------------------------------------------------
# Sync endpoints
# ---------------------------------------------------------------------------

@app.post("/api/sync/calendar", response_model=SyncResponse)
def sync_calendar(db: Session = Depends(get_db)):
    activities = sync_calendar_events()
    return SyncResponse(
        source="calendar",
        activities_synced=len(activities),
        message=f"Synced {len(activities)} calendar events",
    )


@app.post("/api/sync/email", response_model=SyncResponse)
def sync_email(db: Session = Depends(get_db)):
    activities = sync_emails()
    return SyncResponse(
        source="email",
        activities_synced=len(activities),
        message=f"Synced {len(activities)} emails",
    )


@app.post("/api/sync/calls", response_model=SyncResponse)
def sync_calls(db: Session = Depends(get_db)):
    activities = sync_call_log()
    return SyncResponse(
        source="calls",
        activities_synced=len(activities),
        message=f"Synced {len(activities)} call records",
    )


@app.post("/api/sync/all", response_model=list[SyncResponse])
def sync_all(db: Session = Depends(get_db)):
    results = []

    cal = sync_calendar_events()
    results.append(SyncResponse(source="calendar", activities_synced=len(cal), message=f"Synced {len(cal)} calendar events"))

    emails = sync_emails()
    results.append(SyncResponse(source="email", activities_synced=len(emails), message=f"Synced {len(emails)} emails"))

    calls = sync_call_log()
    results.append(SyncResponse(source="calls", activities_synced=len(calls), message=f"Synced {len(calls)} call records"))

    return results


# ---------------------------------------------------------------------------
# Tracker control
# ---------------------------------------------------------------------------

@app.get("/api/tracker/status", response_model=TrackerStatusResponse)
def tracker_status():
    return TrackerStatusResponse(
        running=tracker.running,
        uptime_seconds=tracker.uptime_seconds,
        activities_captured=tracker.activities_captured,
    )


@app.post("/api/tracker/start", response_model=TrackerStatusResponse)
def start_tracker():
    tracker.start()
    return TrackerStatusResponse(
        running=tracker.running,
        uptime_seconds=tracker.uptime_seconds,
        activities_captured=tracker.activities_captured,
    )


@app.post("/api/tracker/stop", response_model=TrackerStatusResponse)
def stop_tracker():
    tracker.stop()
    return TrackerStatusResponse(
        running=tracker.running,
        uptime_seconds=tracker.uptime_seconds,
        activities_captured=tracker.activities_captured,
    )


# ---------------------------------------------------------------------------
# Serve frontend static files (production)
# ---------------------------------------------------------------------------

FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Serve the React SPA for any non-API route."""
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
