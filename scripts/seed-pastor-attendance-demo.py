#!/usr/bin/env python3
"""Seed attendance meeting types, occurrences, and roll-call demo data."""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("Install psycopg: pip install 'psycopg[binary]'", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]

# Re-use connection helpers from seed-pastor-demo.py (hyphenated filename).
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "seed_pastor_demo", ROOT / "scripts" / "seed-pastor-demo.py"
)
_seed = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_seed)

find_church = _seed.find_church
load_connection_string = _seed.load_connection_string
pastor_auth_user_id = _seed.pastor_auth_user_id
pg_connect_url = _seed.pg_connect_url

FIRST = [
    "Marcus", "Daniel", "Sarah", "Grace", "Jordan", "Alex", "Emily", "Noah",
    "Aisha", "Priya", "Ethan", "Chloe", "Taylor", "Morgan", "Ryan", "Olivia",
]
LAST = [
    "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore",
    "Taylor", "Anderson", "Thomas", "Jackson", "Clark", "Lewis", "Walker",
]

DEFAULT_MEETING_TITLE = "Weekly Cell Meeting"
DEFAULT_PENDING_CELL = "Unity Cell"
# .NET DayOfWeek: Sunday=0 … Saturday=6
SATURDAY = 6


def compute_window(meeting_date: date, opens_offset: int, opens_time: time, deadline_offset: int, deadline_time: time):
    opens_at = datetime.combine(meeting_date + timedelta(days=opens_offset), opens_time, tzinfo=timezone.utc)
    deadline_at = datetime.combine(meeting_date + timedelta(days=deadline_offset), deadline_time, tzinfo=timezone.utc)
    return opens_at, deadline_at


def list_cells(cur, church_id: str) -> list[tuple[str, str]]:
    cur.execute(
        """
        SELECT sn."Id", sn."Name"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Cell'
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    return [(str(row[0]), row[1]) for row in cur.fetchall()]


def cell_members(cur, church_id: str, cell_id: str) -> list[tuple[str, str]]:
    cur.execute(
        """
        SELECT cm."Id", cm."Name"
        FROM church_members cm
        WHERE cm."ChurchId" = %s AND cm."ParentNodeId" = %s
        ORDER BY cm."Name"
        """,
        (church_id, cell_id),
    )
    return [(str(row[0]), row[1]) for row in cur.fetchall()]


def ensure_meeting_type(cur, church_id: str, pastor_id: str, title: str, now: datetime) -> str:
    cur.execute(
        """
        SELECT "Id" FROM attendance_meeting_types
        WHERE "ChurchId" = %s AND "Title" = %s AND "IsActive" = true
        ORDER BY "CreatedAt" DESC
        LIMIT 1
        """,
        (church_id, title),
    )
    row = cur.fetchone()
    if row:
        return str(row[0])

    meeting_type_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO attendance_meeting_types
            ("Id", "ChurchId", "Title", "RecurrenceKind", "DayOfWeek", "ScopeKind",
             "OpensDayOffset", "OpensTimeUtc", "DeadlineDayOffset", "DeadlineTimeUtc",
             "AutoGenerateWeeksAhead", "IsActive", "CreatedByAuthUserId", "CreatedAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, %s, %s)
        """,
        (
            meeting_type_id,
            church_id,
            title,
            "Weekly",
            SATURDAY,
            "ChurchWide",
            0,
            time(8, 0),
            1,
            time(23, 59),
            8,
            pastor_id,
            now,
        ),
    )
    return meeting_type_id


def saturdays_from_today(today: date, weeks: int) -> list[date]:
    """Saturdays from the most recent Saturday through the next `weeks`-1 weeks."""
    cursor = today
    while cursor.weekday() != 5:
        cursor -= timedelta(days=1)
    return [cursor + timedelta(days=7 * i) for i in range(weeks)]


def ensure_occurrence(
    cur,
    church_id: str,
    meeting_type_id: str,
    meeting_date: date,
    now: datetime,
    *,
    force_open: bool = False,
) -> str:
    cur.execute(
        """
        SELECT "Id" FROM attendance_occurrences
        WHERE "MeetingTypeId" = %s AND "MeetingDate" = %s
        LIMIT 1
        """,
        (meeting_type_id, meeting_date),
    )
    row = cur.fetchone()
    if row:
        occurrence_id = str(row[0])
    else:
        opens_at, deadline_at = compute_window(meeting_date, 0, time(8, 0), 1, time(23, 59))
        status = "Open" if now >= opens_at else "Scheduled"
        occurrence_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO attendance_occurrences
                ("Id", "ChurchId", "MeetingTypeId", "MeetingDate",
                 "SubmissionOpensAt", "SubmissionDeadlineAt", "Status", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (occurrence_id, church_id, meeting_type_id, meeting_date, opens_at, deadline_at, status, now),
        )

    if force_open:
        cur.execute(
            """
            UPDATE attendance_occurrences
            SET "Status" = 'Open',
                "SubmissionOpensAt" = %s,
                "SubmissionDeadlineAt" = %s
            WHERE "Id" = %s
            """,
            (now - timedelta(hours=2), now + timedelta(days=2), occurrence_id),
        )

    return occurrence_id


def ensure_roll_call(cur, church_id: str, occurrence_id: str, cells: list[tuple[str, str]], now: datetime) -> None:
    for cell_id, _ in cells:
        cur.execute(
            """
            SELECT "Id" FROM attendance_scope_submissions
            WHERE "OccurrenceId" = %s AND "ScopeNodeId" = %s
            LIMIT 1
            """,
            (occurrence_id, cell_id),
        )
        if not cur.fetchone():
            cur.execute(
                """
                INSERT INTO attendance_scope_submissions
                    ("Id", "OccurrenceId", "ScopeNodeId", "ApprovalStatus", "LockStatus")
                VALUES (%s, %s, %s, 'Draft', 'Editable')
                """,
                (str(uuid.uuid4()), occurrence_id, cell_id),
            )

        members = cell_members(cur, church_id, cell_id)
        for member_id, _ in members:
            cur.execute(
                """
                SELECT "Id" FROM attendance_entries
                WHERE "OccurrenceId" = %s AND "MemberId" = %s
                LIMIT 1
                """,
                (occurrence_id, member_id),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO attendance_entries
                        ("Id", "OccurrenceId", "MemberId", "MemberScopeNodeId", "Status")
                    VALUES (%s, %s, %s, %s, 'Unrecorded')
                    """,
                    (str(uuid.uuid4()), occurrence_id, member_id, cell_id),
                )


def seed_cell_roll_call(
    cur,
    church_id: str,
    occurrence_id: str,
    cell_id: str,
    cell_name: str,
    now: datetime,
    *,
    invitee_count: int,
    member_present_ratio: float,
    fellowship_approved: bool,
) -> tuple[int, int]:
    members = cell_members(cur, church_id, cell_id)
    inviters = [(mid, name) for mid, name in members if name]
    if not inviters:
        return 0, 0

    cur.execute(
        """
        SELECT "Id" FROM attendance_entries
        WHERE "OccurrenceId" = %s AND "MemberScopeNodeId" = %s
        """,
        (occurrence_id, cell_id),
    )
    members_present = 0
    for (entry_id,) in cur.fetchall():
        status = "Present" if random.random() < member_present_ratio else "Absent"
        cur.execute(
            """
            UPDATE attendance_entries
            SET "Status" = %s, "MarkedAt" = %s
            WHERE "Id" = %s
            """,
            (status, now, entry_id),
        )
        if status == "Present":
            members_present += 1

    cur.execute(
        'DELETE FROM attendance_invitee_entries WHERE "OccurrenceId" = %s AND "ScopeNodeId" = %s',
        (occurrence_id, cell_id),
    )

    guests_present = 0
    for _ in range(invitee_count):
        inviter_id, _ = random.choice(inviters)
        guest_name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        phone = f"+1614{random.randint(2000000, 9999999)}"
        is_first_timer = random.random() < 0.4
        prior = "Never" if is_first_timer else random.choice(["Once", "MoreThanOnce"])
        invitee_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO attendance_cell_invitees
                ("Id", "ChurchId", "CellScopeNodeId", "Name", "Phone", "IsFirstTimer",
                 "PriorChurchAttendance", "InvitedByMemberId", "IsActive", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true, %s)
            """,
            (invitee_id, church_id, cell_id, guest_name, phone, is_first_timer, prior, inviter_id, now),
        )
        cur.execute(
            """
            INSERT INTO attendance_invitee_entries
                ("Id", "OccurrenceId", "ScopeNodeId", "InviteeId", "Status", "WasFirstTimer")
            VALUES (%s, %s, %s, %s, 'Present', %s)
            """,
            (str(uuid.uuid4()), occurrence_id, cell_id, invitee_id, is_first_timer),
        )
        guests_present += 1

    approval_status = "Approved" if fellowship_approved else "PendingApproval"
    entered_by = "FellowshipLeader" if fellowship_approved else "CellLeader"
    cur.execute(
        """
        UPDATE attendance_scope_submissions
        SET "ApprovalStatus" = %s,
            "EnteredByRole" = %s,
            "LockStatus" = 'Editable',
            "SubmittedAt" = %s,
            "ApprovedAt" = CASE WHEN %s = 'Approved' THEN %s ELSE NULL END
        WHERE "OccurrenceId" = %s AND "ScopeNodeId" = %s
        """,
        (approval_status, entered_by, now, approval_status, now, occurrence_id, cell_id),
    )

    return members_present, guests_present


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed attendance demo for a church.")
    parser.add_argument("--connection")
    parser.add_argument("--production", action="store_true")
    parser.add_argument("--church-name", default="Columbus City Church")
    parser.add_argument("--meeting-title", default=DEFAULT_MEETING_TITLE)
    parser.add_argument("--pending-cell-name", default=DEFAULT_PENDING_CELL)
    parser.add_argument("--weeks", type=int, default=8)
    parser.add_argument("--seed", type=int, default=9052026)
    args = parser.parse_args()

    random.seed(args.seed)
    conn_str = pg_connect_url(args.connection or load_connection_string(args.production))
    now = datetime.now(timezone.utc)
    today = date.today()

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            church_id, church_name = find_church(cur, args.church_name)
            pastor_id = pastor_auth_user_id(cur, church_id)
            cells = list_cells(cur, church_id)
            if not cells:
                raise SystemExit("No cells found — run seed-pastor-demo.py first.")

            meeting_type_id = ensure_meeting_type(cur, church_id, pastor_id, args.meeting_title, now)
            print(f"{church_name}: meeting type {args.meeting_title!r} ({meeting_type_id})")

            saturdays = saturdays_from_today(today, args.weeks)
            occurrence_ids: list[tuple[date, str]] = []
            for meeting_date in saturdays:
                force_open = meeting_date == today or meeting_date == saturdays[0]
                occurrence_id = ensure_occurrence(
                    cur, church_id, meeting_type_id, meeting_date, now, force_open=force_open
                )
                ensure_roll_call(cur, church_id, occurrence_id, cells, now)
                occurrence_ids.append((meeting_date, occurrence_id))

            demo_date = today if today in saturdays else saturdays[0]
            demo_occurrence_id = dict(occurrence_ids)[demo_date]
            overview_cells = [c for c in cells if c[1] != args.pending_cell_name]
            pending_cells = [c for c in cells if c[1] == args.pending_cell_name]
            if not overview_cells:
                overview_cells = cells[:-1] or cells
                pending_cells = cells[-1:] if len(cells) > 1 else []

            total_present = 0
            print(f"\nSeeding roll call for {demo_date}:")
            for index, (cell_id, cell_name) in enumerate(overview_cells):
                mp, gp = seed_cell_roll_call(
                    cur,
                    church_id,
                    demo_occurrence_id,
                    cell_id,
                    cell_name,
                    now,
                    invitee_count=2 + (index % 2),
                    member_present_ratio=0.85,
                    fellowship_approved=True,
                )
                total_present += mp + gp
                print(f"  {cell_name}: {mp} members + {gp} guests (approved → Metrics)")

            for cell_id, cell_name in pending_cells:
                mp, gp = seed_cell_roll_call(
                    cur,
                    church_id,
                    demo_occurrence_id,
                    cell_id,
                    cell_name,
                    now,
                    invitee_count=3,
                    member_present_ratio=0.7,
                    fellowship_approved=False,
                )
                print(f"  {cell_name}: {mp} members + {gp} guests (pending → Approvals)")

            # Prior week: all approved so Metrics has history when switching dates
            if len(occurrence_ids) > 1:
                prior_date, prior_id = occurrence_ids[-2]
                for cell_id, cell_name in cells:
                    seed_cell_roll_call(
                        cur,
                        church_id,
                        prior_id,
                        cell_id,
                        cell_name,
                        now,
                        invitee_count=1,
                        member_present_ratio=0.8,
                        fellowship_approved=True,
                    )
                print(f"\nAlso seeded prior week {prior_date} (all cells approved)")

            conn.commit()

    print(f"\nDone — Metrics should show ~{total_present} present for {demo_date}")
    print(f"Approvals queue should include {args.pending_cell_name!r}")


if __name__ == "__main__":
    main()
