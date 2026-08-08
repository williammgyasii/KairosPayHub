#!/usr/bin/env python3
"""Seed sample Rhapsody contributions for The Powerhouse church (dev)."""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import psycopg
except ImportError:
    print("Install psycopg: pip install 'psycopg[binary]'", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"

CHURCH_ID = "36a46dbc-0961-43c7-a037-f5a9fd84ca57"
PASTOR_AUTH_USER_ID = "e1e33498-7b09-4f8f-b7a7-02f8feb628b2"
ATTACHMENT_KEY = "giving/seed/demo-payment.jpg"

# member_id, amount, status, day in Jan 2026
SAMPLE_CONTRIBUTIONS = [
    ("0864210c-36ad-4f67-bc0c-490c5d483fbe", 100, "Approved", 5),
    ("003055e1-6117-4b44-a5fd-ef1fd606e937", 150, "Approved", 8),
    ("12cde1da-b424-4a87-aea5-2705f06df220", 75, "Approved", 10),
    ("26e13170-61aa-4c15-9e4c-34d4b6100f8d", 200, "Approved", 12),
    ("18c33dfe-3ffe-439b-8b42-a66c7ebc2bc3", 50, "PendingApproval", 14),
    ("0d7e2636-0e4b-4b4c-ba59-73ba00b8251a", 120, "Approved", 15),
    ("253c87ee-0e85-43a9-88e9-f4d973d0b097", 80, "Approved", 18),
    ("0a568604-71a4-441f-ba4c-39c950eaf084", 100, "PendingApproval", 20),
    ("65bed5d9-7490-4689-b04e-c6e2f7ea3e27", 250, "Approved", 22),
    ("04e91117-d6b6-4361-8c2d-0c04e71210a0", 60, "Approved", 25),
    ("a44f5d5c-d88c-4b78-8513-130f2a5116f7", 90, "Approved", 28),
    ("d395cd02-fbd1-4e43-838e-d0ead40162d9", 110, "PendingApproval", 30),
]


def load_connection_string() -> str:
    if not ENV_PATH.exists():
        raise SystemExit(f"Missing {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("ConnectionStrings__Default="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ConnectionStrings__Default not found in .env")


def resolve_program_id(cur) -> tuple[str, str]:
    cur.execute(
        """
        SELECT "Id", "Title", "ParentProgramId"
        FROM giving_programs
        WHERE "ChurchId" = %s AND "Title" = 'Rhapsody 2026'
        ORDER BY "CreatedAt" DESC
        LIMIT 1
        """,
        (CHURCH_ID,),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit("Rhapsody 2026 program not found. Create it in the UI first.")

    root_id, root_title, _ = row
    cur.execute(
        """
        SELECT "Id", "Title"
        FROM giving_programs
        WHERE "ParentProgramId" = %s
        ORDER BY "SortOrder", "CreatedAt"
        LIMIT 1
        """,
        (root_id,),
    )
    child = cur.fetchone()
    if child:
        return child[0], f"{root_title} → {child[1]}"
    return root_id, root_title


def main() -> None:
    conn_str = load_connection_string()
    parsed = urlparse(conn_str)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise SystemExit(f"Unsupported scheme: {parsed.scheme}")

    now = datetime.now(timezone.utc)
    inserted = 0

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            program_id, program_label = resolve_program_id(cur)

            cur.execute(
                'SELECT COUNT(*) FROM contributions WHERE "ProgramId" = %s',
                (program_id,),
            )
            existing = cur.fetchone()[0]
            if existing:
                print(f"Skipping — {existing} contribution(s) already on {program_label}")
                return

            for member_id, amount, status, day in SAMPLE_CONTRIBUTIONS:
                cur.execute(
                    """
                    SELECT "Id", "ParentNodeId", "Name"
                    FROM church_members
                    WHERE "Id" = %s AND "ChurchId" = %s
                    """,
                    (member_id, CHURCH_ID),
                )
                member = cur.fetchone()
                if not member:
                    print(f"  skip unknown member {member_id}")
                    continue

                _, parent_node_id, member_name = member
                contribution_id = str(uuid.uuid4())
                date_sent = datetime(2026, 1, day, 12, 0, tzinfo=timezone.utc)
                approved_at = now if status == "Approved" else None
                approved_by = PASTOR_AUTH_USER_ID if status == "Approved" else None

                cur.execute(
                    """
                    INSERT INTO contributions (
                        "Id", "ProgramId", "MemberId", "Amount", "Currency",
                        "DateSent", "AttachmentKey", "Notes",
                        "EnteredByAuthUserId", "MemberParentNodeId", "Status",
                        "ApprovedByAuthUserId", "ApprovedAt", "CreatedAt"
                    ) VALUES (
                        %s, %s, %s, %s, 'GHS',
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s
                    )
                    """,
                    (
                        contribution_id,
                        program_id,
                        member_id,
                        amount,
                        date_sent,
                        ATTACHMENT_KEY,
                        "Seeded demo contribution",
                        PASTOR_AUTH_USER_ID,
                        parent_node_id,
                        status,
                        approved_by,
                        approved_at,
                        now,
                    ),
                )
                inserted += 1
                print(f"  + {member_name}: GHS {amount} ({status})")

        conn.commit()

    approved_total = sum(a for _, a, s, _ in SAMPLE_CONTRIBUTIONS if s == "Approved")
    pending = sum(1 for *_, s, _ in SAMPLE_CONTRIBUTIONS if s == "PendingApproval")
    print(f"\nDone — {inserted} contributions on {program_label}")
    print(f"  Approved total: GHS {approved_total} · Pending: {pending}")


if __name__ == "__main__":
    main()
