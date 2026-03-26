from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

class ActivityResponse(BaseModel):
    id: int
    app_name: str
    window_title: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    activity_type: Literal["app", "document", "browser", "email", "call", "calendar"]
    metadata: dict = {}
    client_links: list["ActivityClientLinkResponse"] = []

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    date: str
    total_activities: int
    total_duration_seconds: float
    activities: list[ActivityResponse]


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    keywords: list[str] = []


class ClientUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    keywords: list[str] | None = None


class ClientResponse(BaseModel):
    id: int
    name: str
    color: str
    keywords: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Matters
# ---------------------------------------------------------------------------

class MatterCreate(BaseModel):
    client_id: int
    name: str
    description: str = ""
    keywords: list[str] = []


class MatterUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    keywords: list[str] | None = None


class MatterResponse(BaseModel):
    id: int
    client_id: int
    name: str
    description: str
    keywords: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Time Entries
# ---------------------------------------------------------------------------

class TimeEntryCreate(BaseModel):
    client_id: int
    matter_id: int | None = None
    description: str = ""
    start_time: datetime
    end_time: datetime
    duration_seconds: float | None = None
    source: Literal["manual", "ai_suggested"] = "manual"
    status: Literal["draft", "confirmed"] = "draft"


class TimeEntryUpdate(BaseModel):
    client_id: int | None = None
    matter_id: int | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: float | None = None
    status: Literal["draft", "confirmed"] | None = None


class TimeEntryResponse(BaseModel):
    id: int
    client_id: int
    matter_id: int | None
    description: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    source: Literal["manual", "ai_suggested"]
    status: Literal["draft", "confirmed"]
    client: ClientResponse | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Activity <-> Client Links
# ---------------------------------------------------------------------------

class ActivityClientLinkResponse(BaseModel):
    id: int
    activity_id: int
    client_id: int
    confidence: float
    matched_by: str
    client: ClientResponse | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Daily Summary
# ---------------------------------------------------------------------------

class ClientDailySummary(BaseModel):
    client: ClientResponse
    total_seconds: float
    entry_count: int


class DailySummaryResponse(BaseModel):
    date: str
    activities: list[ActivityResponse]
    time_entries: list[TimeEntryResponse]
    client_totals: list[ClientDailySummary]
    total_tracked_seconds: float
    total_billable_entries: int


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------

class AIMatchRequest(BaseModel):
    date: str = Field(description="YYYY-MM-DD")


class AIMatchResult(BaseModel):
    activity_id: int
    client_id: int
    confidence: float
    reason: str


class AISuggestedEntry(BaseModel):
    client_id: int
    matter_id: int | None = None
    description: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    confidence: float
    reasoning: str


class AISuggestEntriesRequest(BaseModel):
    date: str = Field(description="YYYY-MM-DD")


class AISuggestEntriesResponse(BaseModel):
    date: str
    suggestions: list[AISuggestedEntry]


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

class SyncResponse(BaseModel):
    source: str
    activities_synced: int
    message: str


# ---------------------------------------------------------------------------
# Tracker
# ---------------------------------------------------------------------------

class TrackerStatusResponse(BaseModel):
    running: bool
    uptime_seconds: float | None = None
    activities_captured: int = 0
