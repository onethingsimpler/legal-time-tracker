import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

DB_PATH = Path(__file__).parent / "legaltimetracker.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, nullable=False)
    window_title = Column(String, default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    activity_type = Column(
        Enum("app", "document", "browser", "email", "call", "calendar", name="activity_type_enum"),
        default="app",
    )
    metadata_json = Column(Text, default="{}")

    client_links = relationship("ActivityClientLink", back_populates="activity", cascade="all, delete-orphan")

    @property
    def extra_metadata(self) -> dict:
        return json.loads(self.metadata_json) if self.metadata_json else {}

    @extra_metadata.setter
    def extra_metadata(self, value: dict):
        self.metadata_json = json.dumps(value)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#3B82F6")
    keywords_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    matters = relationship("Matter", back_populates="client", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="client", cascade="all, delete-orphan")
    activity_links = relationship("ActivityClientLink", back_populates="client", cascade="all, delete-orphan")

    @property
    def keywords(self) -> list[str]:
        return json.loads(self.keywords_json) if self.keywords_json else []

    @keywords.setter
    def keywords(self, value: list[str]):
        self.keywords_json = json.dumps(value)


class Matter(Base):
    __tablename__ = "matters"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    keywords_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="matters")
    time_entries = relationship("TimeEntry", back_populates="matter", cascade="all, delete-orphan")

    @property
    def keywords(self) -> list[str]:
        return json.loads(self.keywords_json) if self.keywords_json else []

    @keywords.setter
    def keywords(self, value: list[str]):
        self.keywords_json = json.dumps(value)


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    matter_id = Column(Integer, ForeignKey("matters.id"), nullable=True)
    description = Column(Text, default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    source = Column(
        Enum("manual", "ai_suggested", name="time_entry_source_enum"),
        default="manual",
    )
    status = Column(
        Enum("draft", "confirmed", name="time_entry_status_enum"),
        default="draft",
    )


    client = relationship("Client", back_populates="time_entries")
    matter = relationship("Matter", back_populates="time_entries")


class ActivityClientLink(Base):
    __tablename__ = "activity_client_links"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    confidence = Column(Float, nullable=False)
    matched_by = Column(Text, default="")

    activity = relationship("Activity", back_populates="client_links")
    client = relationship("Client", back_populates="activity_links")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
