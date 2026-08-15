#!/usr/bin/env python3
"""Seed August calendar data: member birthdays, custom events, and notifications for cell leaders."""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import date, datetime, timezone
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
ZION_CELL_1_ID = "93f6f837-e455-4398-864d-b74c46425330"
DEFAULT_CELL_LEADER_EMAIL = "zion.cell1@powerhouse.dev"
AUGUST_YEAR = 2026

FIRST = [
    "Ama", "Kojo", "Abena", "Kwame", "Efua", "Yaw", "Grace", "Samuel", "Naomi", "Daniel",
    "Felicia", "Isaac", "Mercy", "Joshua", "Patricia", "Prince", "Angela", "Ruth", "Michael", "Joy",
    "Gloria", "Benjamin", "Comfort", "Victoria", "Elizabeth",
]
LAST = ["Mensah", "Owusu", "Boateng", "Asante", "Appiah", "Gyasi", "Osei", "Darko", "Quaye", "Annan"]

CUSTOM_EVENTS = [
    ("2026-08-02", "Cell outreach planning", ZION_CELL_1_ID, "Review invite list before Saturday outreach."),
    ("2026-08-05", "Midweek prayer call", ZION_CELL_1_ID, "7:30 PM — Zoom link in WhatsApp group."),
    ("2026-08-09", "Zion fellowship fast", ZION_FELLOWSHIP_ID, "Day 1 of the August fast."),
    ("2026-08-12", "Cell leaders check-in", ZION_FELLOWSHIP_ID, "Share wins and prayer needs."),
    ("2026-08-15", "Youth hangout", ZION_CELL_1_ID, "Games night at the church hall."),
    ("2026-08-18", "Evangelism debrief", ZION_CELL_1_ID, "Follow up on first-timer contacts."),
    ("2026-08-22", "Fellowship worship night", ZION_FELLOWSHIP_ID, "Combined worship for all Zion cells."),
    ("2026-08-25", "Cell budget review", ZION_CELL_1_ID, "Review giving and cell expenses."),
    ("2026-08-28", "End-of-month thanksgiving", ZION_FELLOWSHIP_ID, "Bring a testimony to share."),
    ("2026-08-31", "September prep meeting", ZION_CELL_1_ID, "Plan September roll call targets."),
]

CHURCH_WIDE_EVENTS = [
    ("2026-08-03", "Powerhouse all-church prayer", "Monthly prayer and declarations."),
    ("2026-08-17", "Church leadership summit", "Pastors and unit leaders — main auditorium."),
]


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


def leader_auth_user_id(cur, email: str) -> str:
    cur.execute(
        'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = upper(%s)',
        (email,),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit(
            f"No login for {email}. Run: python scripts/provision-cell-leader-login.py"
        )
    return str(row[0])


def upsert_august_birthday_member(
    cur,
    cell_id: str,
    day: int,
    first: str,
    last: str,
    now: datetime,
    *,
    birth_year: int,
) -> tuple[str, str, date]:
    email = f"{first.lower()}.{last.lower()}.aug{day}@powerhouse.dev"
    dob = date(birth_year, 8, day)
    age = AUGUST_YEAR - birth_year

    cur.execute(
        """
        SELECT "Id" FROM church_members
        WHERE "ChurchId" = %s AND lower("Email") = lower(%s)
        LIMIT 1
        """,
        (CHURCH_ID, email),
    )
    existing = cur.fetchone()
    if existing:
        member_id = str(existing[0])
        cur.execute(
            """
            UPDATE church_members
            SET "DateOfBirth" = %s, "Age" = %s, "ParentNodeId" = %s, "Name" = %s
            WHERE "Id" = %s
            """,
            (dob, age, cell_id, f"{first} {last}", member_id),
        )
    else:
        member_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO church_members
                ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Phone", "Position",
                 "DateOfBirth", "Age", "Responsiveness", "CreatedAt")
            VALUES
                (%s, %s, %s, %s, %s, %s, 'Member', %s, %s, %s, %s)
            """,
            (
                member_id,
                CHURCH_ID,
                cell_id,
                f"{first} {last}",
                email,
                f"+23324{random.randint(1000000, 9999999)}",
                dob,
                age,
                random.randint(3, 5),
                now,
            ),
        )

    return member_id, f"{first} {last}", dob


def upsert_calendar_event(
    cur,
    event_date: str,
    title: str,
    scope_node_id: str | None,
    description: str | None,
    created_by: str,
    now: datetime,
) -> str:
    cur.execute(
        """
        SELECT "Id" FROM church_calendar_events
        WHERE "ChurchId" = %s AND "Title" = %s AND "EventDate" = %s
        LIMIT 1
        """,
        (CHURCH_ID, title, event_date),
    )
    row = cur.fetchone()
    if row:
        event_id = str(row[0])
        cur.execute(
            """
            UPDATE church_calendar_events
            SET "ScopeNodeId" = %s, "Description" = %s
            WHERE "Id" = %s
            """,
            (scope_node_id, description, event_id),
        )
        return event_id

    event_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO church_calendar_events
            ("Id", "ChurchId", "ScopeNodeId", "Title", "Description", "EventDate",
             "CreatedByAuthUserId", "CreatedAt")
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (event_id, CHURCH_ID, scope_node_id, title, description, event_date, created_by, now),
    )
    return event_id


def insert_notification(
    cur,
    recipient_id: str,
    kind: str,
    title: str,
    body: str,
    now: datetime,
    *,
    related_entity_id: str | None = None,
) -> None:
    cur.execute(
        """
        INSERT INTO notifications
            ("Id", "ChurchId", "RecipientAuthUserId", "Kind", "Title", "Body",
             "LinkPath", "ProgramId", "RelatedEntityId", "ReadAt", "CreatedAt")
        VALUES
            (%s, %s, %s, %s, %s, %s, 'events', NULL, %s, NULL, %s)
        """,
        (str(uuid.uuid4()), CHURCH_ID, recipient_id, kind, title, body, related_entity_id, now),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", default=DEFAULT_CELL_LEADER_EMAIL)
    parser.add_argument("--seed", type=int, default=15082026)
    args = parser.parse_args()

    random.seed(args.seed)
    now = datetime.now(timezone.utc)
    conn_str = load_connection_string()

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            david_id = leader_auth_user_id(cur, args.email)
            cells = zion_cells(cur)
            if not cells:
                raise SystemExit("No Zion cells found — run seed-powerhouse-structure.py first")

            print(f"Seeding August {AUGUST_YEAR} calendar for {args.email}")

            # Spread birthdays across August — heavier in Zion Cell 1 for David
            birthday_days = list(range(1, 32, 2))  # 1,3,5,...,31
            random.shuffle(birthday_days)
            name_pool = [(FIRST[i % len(FIRST)], LAST[i % len(LAST)]) for i in range(31)]

            members_seeded = 0
            for index, day in enumerate(birthday_days):
                first, last = name_pool[index]
                cell_id = ZION_CELL_1_ID if index < 10 else cells[index % len(cells)][0]
                birth_year = random.randint(1990, 2004)
                _, member_name, dob = upsert_august_birthday_member(
                    cur, cell_id, day, first, last, now, birth_year=birth_year
                )
                turning = AUGUST_YEAR - birth_year
                if cell_id == ZION_CELL_1_ID or index % 3 == 0:
                    insert_notification(
                        cur,
                        david_id,
                        "CalendarBirthdayReminder",
                        "Upcoming birthday",
                        f"{member_name} · Turns {turning} · {dob.strftime('%A, %d %B')}. Open Events to see the full calendar.",
                        now,
                    )
                members_seeded += 1

            print(f"  {members_seeded} members with August birthdays")

            for event_date, title, scope_id, description in CUSTOM_EVENTS:
                event_id = upsert_calendar_event(
                    cur, event_date, title, scope_id, description, david_id, now
                )
                insert_notification(
                    cur,
                    david_id,
                    "CalendarEventReminder",
                    title,
                    f"{description} · {event_date}. Open Events to view your calendar.",
                    now,
                    related_entity_id=event_id,
                )

            for event_date, title, description in CHURCH_WIDE_EVENTS:
                event_id = upsert_calendar_event(
                    cur, event_date, title, None, description, david_id, now
                )
                insert_notification(
                    cur,
                    david_id,
                    "CalendarEventReminder",
                    title,
                    f"Church-wide · {description} · {event_date}.",
                    now,
                    related_entity_id=event_id,
                )

            print(f"  {len(CUSTOM_EVENTS) + len(CHURCH_WIDE_EVENTS)} custom calendar events")
            print(f"  Notifications queued for David ({args.email})")

        conn.commit()

    print()
    print("Done. Log in as David Boateng and open:")
    print("  Events  → full August calendar")
    print("  Bell    → birthday and event reminders (links to Events)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
