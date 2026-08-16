#!/usr/bin/env python3
"""Seed Aug 9 Zion Fellowship roll calls with ~40 present people, phones, and approval mix."""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("Install psycopg: pip install 'psycopg[binary]'", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
CHURCH_ID = "36a46dbc-0961-43c7-a037-f5a9fd84ca57"
ZION_FELLOWSHIP_ID = "1a15df31-3f9a-4fa7-80ee-6ea7d4df2722"
DEFAULT_MEETING_DATE = "2026-08-09"
DEFAULT_OVERVIEW_PRESENT = 42
DEFAULT_PENDING_CELL = "Zion Cell 2"

FIRST = [
    "Ama", "Kojo", "Abena", "Kwame", "Efua", "Yaw", "Grace", "Samuel", "Naomi", "Daniel",
    "Felicia", "Isaac", "Mercy", "Joshua", "Patricia", "Prince", "Angela", "Ruth", "Michael", "Joy",
]
LAST = ["Mensah", "Owusu", "Boateng", "Asante", "Appiah", "Gyasi", "Osei", "Darko", "Quaye", "Annan"]


def load_connection_string() -> str:
    if not ENV_PATH.exists():
        raise SystemExit(f"Missing {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("ConnectionStrings__Default="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ConnectionStrings__Default not found in .env")


def zion_cells(cur) -> list[tuple[str, str]]:
    cur.execute(
        """
        SELECT sn."Id", sn."Name"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s
          AND sn."ParentNodeId" = %s
          AND sl."StandardType" = 'Cell'
        ORDER BY sn."Name"
        """,
        (CHURCH_ID, ZION_FELLOWSHIP_ID),
    )
    return [(str(row[0]), row[1]) for row in cur.fetchall()]


def occurrence_for_date(cur, meeting_date: str) -> tuple[str, str]:
    cur.execute(
        """
        SELECT o."Id", mt."Title"
        FROM attendance_occurrences o
        JOIN attendance_meeting_types mt ON mt."Id" = o."MeetingTypeId"
        WHERE o."ChurchId" = %s AND o."MeetingDate" = %s
        ORDER BY mt."Title"
        LIMIT 1
        """,
        (CHURCH_ID, meeting_date),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"No attendance occurrence found for {meeting_date}")
    return str(row[0]), row[1]


def cell_member_inviters(cur, cell_id: str) -> list[tuple[str, str]]:
    cur.execute(
        """
        WITH RECURSIVE subtree AS (
            SELECT "Id" FROM structure_nodes WHERE "Id" = %s
            UNION ALL
            SELECT sn."Id"
            FROM structure_nodes sn
            JOIN subtree st ON sn."ParentNodeId" = st."Id"
        )
        SELECT cm."Id", cm."Name"
        FROM church_members cm
        WHERE cm."ChurchId" = %s
          AND cm."ParentNodeId" IN (SELECT "Id" FROM subtree)
          AND cm."Position" = 'Member'
        ORDER BY cm."Name"
        """,
        (cell_id, CHURCH_ID),
    )
    return [(str(row[0]), row[1]) for row in cur.fetchall()]


def open_occurrence(cur, occurrence_id: str, now: datetime) -> None:
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


def clear_cell_invitees_for_occurrence(cur, occurrence_id: str, cell_id: str) -> None:
    cur.execute(
        """
        DELETE FROM attendance_invitee_entries
        WHERE "OccurrenceId" = %s AND "ScopeNodeId" = %s
        """,
        (occurrence_id, cell_id),
    )


def seed_cell_roll_call(
    cur,
    occurrence_id: str,
    cell_id: str,
    cell_name: str,
    now: datetime,
    *,
    invitee_present_target: int,
    member_present_ratio: float,
    fellowship_approved: bool,
) -> tuple[int, int, int]:
    inviters = cell_member_inviters(cur, cell_id)
    if not inviters:
        raise SystemExit(f"No members found to invite guests for {cell_name}")

    cur.execute(
        """
        SELECT "Id"
        FROM attendance_entries
        WHERE "OccurrenceId" = %s AND "MemberScopeNodeId" = %s
        ORDER BY "MemberId"
        """,
        (occurrence_id, cell_id),
    )
    entry_ids = [row[0] for row in cur.fetchall()]
    members_present = 0
    members_absent = 0
    for entry_id in entry_ids:
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
        else:
            members_absent += 1

    clear_cell_invitees_for_occurrence(cur, occurrence_id, cell_id)

    invitees_present = 0
    first_timers = 0
    for index in range(invitee_present_target):
        inviter_id, inviter_name = random.choice(inviters)
        guest_name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        phone = f"+23324{random.randint(1000000, 9999999)}"
        is_first_timer = random.random() < 0.45
        prior = "Never" if is_first_timer else random.choice(["Once", "MoreThanOnce"])
        invitee_id = str(uuid.uuid4())

        cur.execute(
            """
            INSERT INTO attendance_cell_invitees
                ("Id", "ChurchId", "CellScopeNodeId", "Name", "Phone", "IsFirstTimer",
                 "PriorChurchAttendance", "InvitedByMemberId", "IsActive", "CreatedAt")
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, true, %s)
            """,
            (
                invitee_id,
                CHURCH_ID,
                cell_id,
                guest_name,
                phone,
                is_first_timer,
                prior,
                inviter_id,
                now,
            ),
        )
        cur.execute(
            """
            INSERT INTO attendance_invitee_entries
                ("Id", "OccurrenceId", "ScopeNodeId", "InviteeId", "Status", "WasFirstTimer")
            VALUES
                (%s, %s, %s, %s, 'Present', %s)
            """,
            (str(uuid.uuid4()), occurrence_id, cell_id, invitee_id, is_first_timer),
        )
        invitees_present += 1
        if is_first_timer:
            first_timers += 1

    entered_by = "FellowshipLeader" if fellowship_approved else "CellLeader"
    approval_status = "Approved" if fellowship_approved else "PendingApproval"
    cur.execute(
        """
        UPDATE attendance_scope_submissions
        SET "ApprovalStatus" = %s,
            "EnteredByRole" = %s,
            "LockStatus" = 'Editable',
            "SubmittedAt" = %s,
            "SubmittedByAuthUserId" = NULL,
            "ApprovedByAuthUserId" = NULL,
            "ApprovedAt" = CASE WHEN %s = 'Approved' THEN %s ELSE NULL END,
            "RejectedByAuthUserId" = NULL,
            "RejectedAt" = NULL,
            "RejectionReason" = NULL
        WHERE "OccurrenceId" = %s AND "ScopeNodeId" = %s
        """,
        (approval_status, entered_by, now, approval_status, now, occurrence_id, cell_id),
    )

    return members_present, members_absent, invitees_present


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--meeting-date", default=DEFAULT_MEETING_DATE)
    parser.add_argument("--overview-present-target", type=int, default=DEFAULT_OVERVIEW_PRESENT)
    parser.add_argument("--pending-cell-name", default=DEFAULT_PENDING_CELL)
    parser.add_argument("--seed", type=int, default=9082026)
    args = parser.parse_args()

    random.seed(args.seed)
    now = datetime.now(timezone.utc)
    conn_str = load_connection_string()

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cells = zion_cells(cur)
            if len(cells) < 2:
                raise SystemExit("Expected at least 2 cells under Zion Fellowship")

            overview_cells = [cell for cell in cells if cell[1] != args.pending_cell_name]
            pending_cells = [cell for cell in cells if cell[1] == args.pending_cell_name]
            if not overview_cells:
                overview_cells = [cells[0]]
                pending_cells = [cells[1]] if len(cells) > 1 else []

            occurrence_id, meeting_title = occurrence_for_date(cur, args.meeting_date)
            open_occurrence(cur, occurrence_id, now)

            cur.execute(
                """
                UPDATE attendance_scope_submissions
                SET "LockStatus" = 'Editable'
                WHERE "OccurrenceId" = %s AND "ScopeNodeId" = ANY(%s::uuid[])
                """,
                (occurrence_id, [cell_id for cell_id, _ in cells]),
            )

            print(f"Seeding {meeting_title} · {args.meeting_date} for Zion Fellowship")

            overview_member_slots = len(overview_cells) * 6
            overview_invitee_target = max(0, args.overview_present_target - overview_member_slots)
            invitees_per_overview_cell = overview_invitee_target // max(1, len(overview_cells))
            extra = overview_invitee_target % max(1, len(overview_cells))

            total_present = 0
            for index, (cell_id, cell_name) in enumerate(overview_cells):
                target = invitees_per_overview_cell + (1 if index < extra else 0)
                mp, ma, ip = seed_cell_roll_call(
                    cur,
                    occurrence_id,
                    cell_id,
                    cell_name,
                    now,
                    invitee_present_target=target,
                    member_present_ratio=0.85,
                    fellowship_approved=True,
                )
                total_present += mp + ip
                print(
                    f"  {cell_name}: {mp} members + {ip} guests present "
                    f"(fellowship approved, shows in overview)"
                )

            for cell_id, cell_name in pending_cells:
                mp, ma, ip = seed_cell_roll_call(
                    cur,
                    occurrence_id,
                    cell_id,
                    cell_name,
                    now,
                    invitee_present_target=8,
                    member_present_ratio=0.7,
                    fellowship_approved=False,
                )
                print(
                    f"  {cell_name}: {mp} members + {ip} guests present "
                    f"(awaiting fellowship approval — in Approvals queue)"
                )

        conn.commit()

    print()
    print(f"Overview should show ~{total_present} present people for approved cells.")
    print(f"Approvals queue should include {args.pending_cell_name}.")
    print("Login: zion.fellowship@powerhouse.dev → Attendance → Overview / Approvals")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
