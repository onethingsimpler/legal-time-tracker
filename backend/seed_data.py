#!/usr/bin/env python3
"""Seed the database with realistic demo data for a lawyer's workday."""

import json
import sys
from datetime import datetime, timedelta

from database import Activity, ActivityClientLink, Base, Client, Matter, SessionLocal, TimeEntry, engine


def today_at(hour: int, minute: int = 0) -> datetime:
    now = datetime.now()
    return now.replace(hour=hour, minute=minute, second=0, microsecond=0)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data
        db.query(ActivityClientLink).delete()
        db.query(TimeEntry).delete()
        db.query(Activity).delete()
        db.query(Matter).delete()
        db.query(Client).delete()
        db.commit()

        # ==================================================================
        # CLIENTS
        # ==================================================================
        print("Seeding clients...")
        clients_data = [
            {"name": "Morgan Ltd.", "color": "#3B82F6", "keywords": ["morgan", "Morgan Ltd", "morgan ltd"]},
            {"name": "Axion Ltd.", "color": "#EF4444", "keywords": ["axion", "Axion Ltd", "axion ltd"]},
            {"name": "Harper & Associates", "color": "#10B981", "keywords": ["harper", "Harper & Associates", "james harper", "harper associates"]},
            {"name": "AcmeCorp", "color": "#F59E0B", "keywords": ["acme", "AcmeCorp", "acmecorp", "acme corp"]},
            {"name": "Daven Ltd.", "color": "#8B5CF6", "keywords": ["daven", "Daven Ltd", "daven ltd", "john daven"]},
        ]

        clients = {}
        for data in clients_data:
            client = Client(name=data["name"], color=data["color"], keywords_json=json.dumps(data["keywords"]))
            db.add(client)
            db.flush()
            clients[data["name"]] = client

        # ==================================================================
        # MATTERS
        # ==================================================================
        print("Seeding matters...")
        matters_data = [
            {"client": "Morgan Ltd.", "name": "Contract Review", "description": "Review and amend service agreement"},
            {"client": "Morgan Ltd.", "name": "Corporate Restructuring", "description": "Advise on subsidiary merger"},
            {"client": "Axion Ltd.", "name": "IP Dispute", "description": "Patent infringement claim defense"},
            {"client": "Axion Ltd.", "name": "Licensing Agreement", "description": "Draft software licensing terms"},
            {"client": "Harper & Associates", "name": "Employment Matter", "description": "Executive employment agreement review"},
            {"client": "Harper & Associates", "name": "Real Estate Acquisition", "description": "Due diligence for office purchase"},
            {"client": "AcmeCorp", "name": "Quarterly Billing", "description": "Q1 billing review and reconciliation"},
            {"client": "AcmeCorp", "name": "Compliance Audit", "description": "Annual regulatory compliance review"},
            {"client": "Daven Ltd.", "name": "Performance Review", "description": "Vendor performance assessment"},
            {"client": "Daven Ltd.", "name": "Litigation Support", "description": "Document review for pending case"},
        ]

        matters = {}
        for data in matters_data:
            matter = Matter(
                client_id=clients[data["client"]].id,
                name=data["name"],
                description=data["description"],
                keywords_json=json.dumps([]),
            )
            db.add(matter)
            db.flush()
            matters[f"{data['client']} - {data['name']}"] = matter

        # ==================================================================
        # ACTIVITIES - Full realistic lawyer day
        # ==================================================================
        print("Seeding activities...")

        activities_data = [
            # --- COMPUTER / DOCUMENT ACTIVITIES ---
            {
                "app_name": "Microsoft Word",
                "window_title": "Morgan_Ltd_Service_Agreement_v4_REDLINE.docx",
                "start": today_at(8, 30), "end": today_at(9, 15),
                "activity_type": "document", "client": "Morgan Ltd.",
            },
            {
                "app_name": "Adobe Acrobat",
                "window_title": "Morgan_Ltd_Board_Resolution_2026.pdf",
                "start": today_at(9, 15), "end": today_at(9, 30),
                "activity_type": "document", "client": "Morgan Ltd.",
            },
            {
                "app_name": "Microsoft Excel",
                "window_title": "AcmeCorp_Q1_Billing_Reconciliation.xlsx",
                "start": today_at(10, 30), "end": today_at(11, 0),
                "activity_type": "document", "client": "AcmeCorp",
            },
            {
                "app_name": "Microsoft Word",
                "window_title": "Axion_IP_Claim_Response_FINAL.docx",
                "start": today_at(11, 30), "end": today_at(12, 15),
                "activity_type": "document", "client": "Axion Ltd.",
            },
            {
                "app_name": "Google Chrome",
                "window_title": "Westlaw - Patent Infringement Case Law 2025-2026",
                "start": today_at(12, 15), "end": today_at(12, 45),
                "activity_type": "browser", "client": "Axion Ltd.",
            },
            {
                "app_name": "Microsoft PowerPoint",
                "window_title": "Daven_Vendor_Performance_Brief_Q1.pptx",
                "start": today_at(13, 30), "end": today_at(14, 0),
                "activity_type": "document", "client": "Daven Ltd.",
            },
            {
                "app_name": "Microsoft Word",
                "window_title": "Harper_Exec_Employment_Agreement_v3_TRACKED.docx",
                "start": today_at(14, 30), "end": today_at(15, 15),
                "activity_type": "document", "client": "Harper & Associates",
            },
            {
                "app_name": "Adobe Acrobat",
                "window_title": "AcmeCorp_Regulatory_Compliance_Checklist.pdf",
                "start": today_at(15, 30), "end": today_at(15, 45),
                "activity_type": "document", "client": "AcmeCorp",
            },
            {
                "app_name": "Google Chrome",
                "window_title": "SEC.gov - Recent Enforcement Actions & Compliance Updates",
                "start": today_at(15, 45), "end": today_at(16, 0),
                "activity_type": "browser", "client": "AcmeCorp",
            },
            {
                "app_name": "Microsoft Word",
                "window_title": "Daven_Litigation_Memo_re_Discovery_Responses.docx",
                "start": today_at(16, 30), "end": today_at(17, 0),
                "activity_type": "document", "client": "Daven Ltd.",
            },

            # --- CALENDAR EVENTS ---
            {
                "app_name": "Calendar",
                "window_title": "Team Standup - Litigation Group",
                "start": today_at(8, 45), "end": today_at(9, 0),
                "activity_type": "calendar", "client": None,
            },
            {
                "app_name": "Calendar",
                "window_title": "Meeting with James Harper - Employment Terms Review",
                "start": today_at(10, 0), "end": today_at(10, 30),
                "activity_type": "calendar", "client": "Harper & Associates",
            },
            {
                "app_name": "Calendar",
                "window_title": "Morgan Ltd. - Contract Negotiation Call",
                "start": today_at(11, 0), "end": today_at(11, 30),
                "activity_type": "calendar", "client": "Morgan Ltd.",
            },
            {
                "app_name": "Calendar",
                "window_title": "Lunch - Partner Review (Private)",
                "start": today_at(12, 45), "end": today_at(13, 30),
                "activity_type": "calendar", "client": None,
            },
            {
                "app_name": "Calendar",
                "window_title": "AcmeCorp - Compliance Review & Audit Prep",
                "start": today_at(16, 0), "end": today_at(16, 30),
                "activity_type": "calendar", "client": "AcmeCorp",
            },

            # --- PHONE / VIDEO CALLS ---
            {
                "app_name": "Phone",
                "window_title": "Sarah Chen (Morgan Ltd. - General Counsel)",
                "start": today_at(9, 30), "end": today_at(9, 45),
                "activity_type": "call", "client": "Morgan Ltd.",
            },
            {
                "app_name": "FaceTime",
                "window_title": "James Harper - (917) 555-0142",
                "start": today_at(10, 0), "end": today_at(10, 25),
                "activity_type": "call", "client": "Harper & Associates",
            },
            {
                "app_name": "Phone",
                "window_title": "John Daven - (212) 555-0198",
                "start": today_at(13, 30), "end": today_at(13, 50),
                "activity_type": "call", "client": "Daven Ltd.",
            },
            {
                "app_name": "Phone",
                "window_title": "Opposing Counsel - Richards & Webb LLP",
                "start": today_at(14, 0), "end": today_at(14, 15),
                "activity_type": "call", "client": "Daven Ltd.",
            },
            {
                "app_name": "Zoom",
                "window_title": "AcmeCorp - Compliance Review Call",
                "start": today_at(16, 0), "end": today_at(16, 30),
                "activity_type": "call", "client": "AcmeCorp",
            },
            {
                "app_name": "Phone",
                "window_title": "Court Clerk - NY Supreme Court (Filing Confirmation)",
                "start": today_at(17, 0), "end": today_at(17, 10),
                "activity_type": "call", "client": "Daven Ltd.",
            },

            # --- EMAILS ---
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Re: Morgan Ltd - Service Agreement Amendment (Sarah Chen)",
                "start": today_at(8, 30), "end": today_at(8, 45),
                "activity_type": "email", "client": "Morgan Ltd.",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "FW: Board Resolution - Morgan Ltd. Restructuring",
                "start": today_at(9, 15), "end": today_at(9, 30),
                "activity_type": "email", "client": "Morgan Ltd.",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Re: Introduction - Axion Ltd. IP Matters",
                "start": today_at(11, 0), "end": today_at(11, 10),
                "activity_type": "email", "client": "Axion Ltd.",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Axion Ltd. - Patent Filing Deadline Reminder (Mar 31)",
                "start": today_at(11, 15), "end": today_at(11, 25),
                "activity_type": "email", "client": "Axion Ltd.",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Re: Harper Employment Agreement - Final Comments from James",
                "start": today_at(14, 15), "end": today_at(14, 30),
                "activity_type": "email", "client": "Harper & Associates",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "AcmeCorp - Q1 Invoice #2026-0341 Attached",
                "start": today_at(15, 15), "end": today_at(15, 25),
                "activity_type": "email", "client": "AcmeCorp",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Meeting Notes: AcmeCorp Compliance Audit Prep",
                "start": today_at(16, 30), "end": today_at(16, 45),
                "activity_type": "email", "client": "AcmeCorp",
            },
            {
                "app_name": "Microsoft Outlook",
                "window_title": "Daven Ltd. - Discovery Responses Due April 7",
                "start": today_at(17, 0), "end": today_at(17, 15),
                "activity_type": "email", "client": "Daven Ltd.",
            },
        ]

        activities = []
        for data in activities_data:
            duration = (data["end"] - data["start"]).total_seconds()
            activity = Activity(
                app_name=data["app_name"],
                window_title=data["window_title"],
                start_time=data["start"],
                end_time=data["end"],
                duration_seconds=duration,
                activity_type=data["activity_type"],
                metadata_json=json.dumps({}),
            )
            db.add(activity)
            db.flush()
            activities.append((activity, data.get("client")))

        # ==================================================================
        # ACTIVITY <-> CLIENT LINKS
        # ==================================================================
        print("Seeding AI client matches...")
        for activity, client_name in activities:
            if client_name and client_name in clients:
                link = ActivityClientLink(
                    activity_id=activity.id,
                    client_id=clients[client_name].id,
                    confidence=0.95,
                    matched_by="AI: client name found in document/email title",
                )
                db.add(link)

        # ==================================================================
        # TIME ENTRIES (AI-suggested, grouped by client work blocks)
        # ==================================================================
        print("Seeding time entries...")
        time_entries_data = [
            {
                "client": "Morgan Ltd.", "matter": "Morgan Ltd. - Contract Review",
                "description": "Reviewed and redlined service agreement v4; reviewed board resolution; email correspondence with Sarah Chen re: amendment terms; call with General Counsel",
                "start": today_at(8, 30), "end": today_at(9, 48),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "Harper & Associates", "matter": "Harper & Associates - Employment Matter",
                "description": "Meeting with James Harper to review executive employment terms; discussed non-compete and severance provisions",
                "start": today_at(10, 0), "end": today_at(10, 30),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "AcmeCorp", "matter": "AcmeCorp - Quarterly Billing",
                "description": "Reconciled Q1 billing spreadsheet; prepared invoice #2026-0341",
                "start": today_at(10, 30), "end": today_at(11, 0),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "Morgan Ltd.", "matter": "Morgan Ltd. - Corporate Restructuring",
                "description": "Contract negotiation call; discussed subsidiary merger timeline and regulatory approvals",
                "start": today_at(11, 0), "end": today_at(11, 30),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "Axion Ltd.", "matter": "Axion Ltd. - IP Dispute",
                "description": "Email correspondence re: introduction and patent filing deadline; finalized IP claim response; Westlaw patent case law research",
                "start": today_at(11, 0), "end": today_at(12, 48),
                "source": "ai_suggested", "status": "draft",
            },
            {
                "client": "Daven Ltd.", "matter": "Daven Ltd. - Performance Review",
                "description": "Call with John Daven re: vendor performance Q1; prepared performance brief presentation; call with opposing counsel (Richards & Webb LLP)",
                "start": today_at(13, 30), "end": today_at(14, 18),
                "source": "ai_suggested", "status": "draft",
            },
            {
                "client": "Harper & Associates", "matter": "Harper & Associates - Employment Matter",
                "description": "Reviewed final comments from James Harper; revised executive employment agreement v3 with tracked changes",
                "start": today_at(14, 18), "end": today_at(15, 18),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "AcmeCorp", "matter": "AcmeCorp - Compliance Audit",
                "description": "Reviewed regulatory compliance checklist and SEC enforcement updates; Zoom compliance review call; drafted follow-up meeting notes",
                "start": today_at(15, 30), "end": today_at(16, 48),
                "source": "ai_suggested", "status": "confirmed",
            },
            {
                "client": "Daven Ltd.", "matter": "Daven Ltd. - Litigation Support",
                "description": "Drafted litigation memo re: discovery responses; call with court clerk for filing confirmation; email re: discovery deadline April 7",
                "start": today_at(16, 30), "end": today_at(17, 18),
                "source": "ai_suggested", "status": "draft",
            },
        ]

        for data in time_entries_data:
            duration = (data["end"] - data["start"]).total_seconds()
            # Round to 6-minute increments (standard legal billing)
            duration = round(duration / 360) * 360
            matter = matters.get(data["matter"])
            entry = TimeEntry(
                client_id=clients[data["client"]].id,
                matter_id=matter.id if matter else None,
                description=data["description"],
                start_time=data["start"],
                end_time=data["start"] + timedelta(seconds=duration),
                duration_seconds=duration,
                source=data["source"],
                status=data["status"],
            )
            db.add(entry)

        db.commit()

        # Count by type
        type_counts = {}
        for act, _ in activities:
            t = act.activity_type
            type_counts[t] = type_counts.get(t, 0) + 1

        print()
        print("Seed data loaded successfully!")
        print(f"  Clients:         {len(clients_data)}")
        print(f"  Matters:         {len(matters_data)}")
        print(f"  Activities:      {len(activities_data)}")
        for t, c in sorted(type_counts.items()):
            print(f"    - {t}: {c}")
        print(f"  Time Entries:    {len(time_entries_data)}")
        print()

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
