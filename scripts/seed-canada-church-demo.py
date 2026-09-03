#!/usr/bin/env python3
"""Seed demo members for Canada Church — diverse roster with a full Titans Cell."""

from __future__ import annotations

import argparse
import itertools
import random
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import psycopg
except ImportError:
    print("Install psycopg: pip install 'psycopg[binary]'", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"

DEFAULT_CHURCH_NAME = "Canada Church"
DEFAULT_TOTAL_MEMBERS = 72
TITANS_CELL_MIN = 14
TITANS_CELL_NAME = "Titans Cell"

FIRST_NAMES = [
    "Amara", "Chidi", "Ngozi", "Kofi", "Amina", "Daniel", "Sarah", "Michael",
    "Grace", "David", "Ruth", "Samuel", "Naomi", "Isaac", "Esther", "Joshua",
    "Mercy", "Benjamin", "Hannah", "Joseph", "Olivia", "Ethan", "Sophia", "Noah",
    "Chloe", "Liam", "Ava", "Marcus", "Priya", "Chen", "Fatima", "Omar",
    "Aisha", "Ryan", "Emily", "Jordan", "Taylor", "Morgan", "Alex", "Jamal",
]

LAST_NAMES = [
    "Okafor", "Mensah", "Boateng", "Singh", "Patel", "Nguyen", "Kim", "Williams",
    "Johnson", "Brown", "Martinez", "Anderson", "Thompson", "Campbell", "Fraser",
    "MacDonald", "Lefebvre", "Tremblay", "Roy", "Gagnon", "Chen", "Ali", "Hassan",
    "Osei", "Gyasi", "Amoah", "Darko", "Owusu", "Asante", "Agyeman",
]

RESIDENCES = [
    "Toronto", "Mississauga", "Brampton", "Scarborough", "Markham", "Vaughan",
    "Ottawa", "Hamilton", "Kitchener", "Calgary", "Edmonton", "Vancouver",
    "Montreal", "Windsor", "London ON", "Barrie",
]

SCHOOLS = [
    "University of Toronto", "York University", "Ryerson", "McMaster University",
    "University of Ottawa", "Seneca College", "Humber College", "George Brown College",
    "TD Bank", "RBC", "Shopify", "Amazon Canada", "SickKids Hospital", "Self-employed",
]

OCCUPATIONS = [0, 1, 2, 3, 4]
RESPONSIVENESS_LEVELS = [1, 2, 3, 4, 5]


def load_connection_string() -> str:
    if not ENV_PATH.exists():
        raise SystemExit(f"Missing {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("ConnectionStrings__Default="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ConnectionStrings__Default not found in .env")


def pg_connect_url(raw: str) -> str:
    parsed = urlparse(raw)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise SystemExit(f"Unsupported scheme: {parsed.scheme}")
    return raw


def find_church(cur, church_name: str) -> tuple[str, str]:
    cur.execute(
        'SELECT "Id", "Name" FROM church_tenants WHERE lower("Name") = lower(%s) LIMIT 1',
        (church_name,),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"Church not found: {church_name}")
    return str(row[0]), row[1]


def list_cells(cur, church_id: str) -> list[tuple[str, str, int]]:
    cur.execute(
        """
        SELECT sn."Id", sn."Name", COUNT(cm."Id")::int
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId" AND sl."StandardType" = 'Cell'
        LEFT JOIN church_members cm ON cm."ParentNodeId" = sn."Id"
        WHERE sn."ChurchId" = %s
        GROUP BY sn."Id", sn."Name"
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    return [(str(row[0]), row[1], row[2]) for row in cur.fetchall()]


def member_count(cur, church_id: str) -> int:
    cur.execute('SELECT COUNT(*) FROM church_members WHERE "ChurchId" = %s', (church_id,))
    return int(cur.fetchone()[0])


def existing_emails(cur, church_id: str) -> set[str]:
    cur.execute('SELECT lower("Email") FROM church_members WHERE "ChurchId" = %s AND "Email" IS NOT NULL', (church_id,))
    return {row[0] for row in cur.fetchall() if row[0]}


def unique_names(count: int, reserved: set[str]) -> list[str]:
    combos = [f"{first} {last}" for first, last in itertools.product(FIRST_NAMES, LAST_NAMES)]
    random.shuffle(combos)
    names: list[str] = []
    for candidate in combos:
        if candidate.lower() in reserved:
            continue
        names.append(candidate)
        if len(names) >= count:
            break
    if len(names) < count:
        raise SystemExit(f"Could only generate {len(names)} unique names (requested {count})")
    return names


def member_profile(idx: int, name: str, occupation: int, responsiveness: int) -> dict:
    year = random.randint(1975, 2006)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    slug = name.lower().replace(" ", ".")
    area = random.choice(["416", "647", "437", "905", "613", "403", "587", "780"])
    return {
        "name": name,
        "email": f"{slug}.{idx:03d}@canada-church.demo",
        "phone": f"+1{area}{random.randint(2000000, 9999999)}",
        "age": 2026 - year,
        "date_of_birth": date(year, month, day),
        "residence": random.choice(RESIDENCES),
        "occupation": occupation,
        "school": random.choice(SCHOOLS),
        "responsiveness": responsiveness,
    }


def insert_member(cur, church_id: str, cell_id: str, profile: dict, now: datetime) -> None:
    cur.execute(
        """
        INSERT INTO church_members
            ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Phone",
             "Age", "DateOfBirth", "Residence", "OccupationStatus",
             "SchoolOrWorkplace", "Position", "Responsiveness", "CreatedAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            church_id,
            cell_id,
            profile["name"],
            profile["email"],
            profile["phone"],
            profile["age"],
            profile["date_of_birth"],
            profile["residence"],
            profile["occupation"],
            profile["school"],
            "Member",
            profile["responsiveness"],
            now,
        ),
    )


def assign_leaders(cur, church_id: str) -> dict[str, int]:
    counts = {"fellowship": 0, "cell": 0, "pfcc": 0}

    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Fellowship'
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    for (fellowship_id,) in cur.fetchall():
        cur.execute(
            """
            WITH RECURSIVE subtree AS (
                SELECT "Id" FROM structure_nodes WHERE "Id" = %s
                UNION ALL
                SELECT sn."Id"
                FROM structure_nodes sn
                JOIN subtree st ON sn."ParentNodeId" = st."Id"
            )
            SELECT cm."Id"
            FROM church_members cm
            WHERE cm."ChurchId" = %s
              AND cm."ParentNodeId" IN (SELECT "Id" FROM subtree)
            ORDER BY cm."Name", cm."CreatedAt"
            LIMIT 1
            """,
            (fellowship_id, church_id),
        )
        row = cur.fetchone()
        if not row:
            continue
        member_id = row[0]
        cur.execute('UPDATE church_members SET "Position" = %s WHERE "Id" = %s', ("FellowshipLeader", member_id))
        cur.execute('UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s', (member_id, fellowship_id))
        counts["fellowship"] += 1

    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Cell'
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    for (cell_id,) in cur.fetchall():
        cur.execute(
            """
            SELECT cm."Id", cm."Position"
            FROM church_members cm
            WHERE cm."ChurchId" = %s AND cm."ParentNodeId" = %s
            ORDER BY cm."Name", cm."CreatedAt"
            LIMIT 1
            """,
            (church_id, cell_id),
        )
        row = cur.fetchone()
        if not row:
            continue
        member_id, position = row
        if position == "Member":
            cur.execute('UPDATE church_members SET "Position" = %s WHERE "Id" = %s', ("CellLeader", member_id))
        cur.execute('UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s', (member_id, cell_id))
        counts["cell"] += 1

    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'PFCC'
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    for (pfcc_id,) in cur.fetchall():
        cur.execute(
            """
            WITH RECURSIVE subtree AS (
                SELECT "Id" FROM structure_nodes WHERE "Id" = %s
                UNION ALL
                SELECT sn."Id"
                FROM structure_nodes sn
                JOIN subtree st ON sn."ParentNodeId" = st."Id"
            )
            SELECT cm."Id"
            FROM church_members cm
            WHERE cm."ChurchId" = %s
              AND cm."ParentNodeId" IN (SELECT "Id" FROM subtree)
              AND cm."Position" = 'Member'
            ORDER BY cm."Name", cm."CreatedAt"
            LIMIT 1
            """,
            (pfcc_id, church_id),
        )
        row = cur.fetchone()
        if not row:
            continue
        member_id = row[0]
        cur.execute('UPDATE church_members SET "Position" = %s WHERE "Id" = %s', ("PfccManager", member_id))
        cur.execute('UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s', (member_id, pfcc_id))
        counts["pfcc"] += 1

    return counts


def build_cell_targets(
    cells: list[tuple[str, str, int]],
    total_target: int,
    titans_min: int,
) -> dict[str, int]:
    if not cells:
        raise SystemExit("No cell nodes found — set up structure first.")

    titans = next(((cid, name, count) for cid, name, count in cells if name == TITANS_CELL_NAME), None)
    if titans is None:
        raise SystemExit(f'Cell "{TITANS_CELL_NAME}" not found — create it in Structure first.')

    titans_id, _, titans_existing = titans
    titans_needed = max(0, titans_min - titans_existing)

    other_cells = [(cid, name, count) for cid, name, count in cells if cid != titans_id]
    remaining = max(0, total_target - sum(count for _, _, count in cells) - titans_needed)

    targets: dict[str, int] = {titans_id: titans_needed}
    if not other_cells:
        targets[titans_id] += remaining
        return targets

    per_other = remaining // len(other_cells)
    extra = remaining % len(other_cells)
    for index, (cell_id, _, _) in enumerate(other_cells):
        targets[cell_id] = per_other + (1 if index < extra else 0)

    return targets


def seed_members(
    cur,
    church_id: str,
    cells: list[tuple[str, str, int]],
    total_target: int,
    titans_min: int,
    now: datetime,
) -> tuple[int, dict[str, int]]:
    targets = build_cell_targets(cells, total_target, titans_min)
    to_create = sum(targets.values())
    if to_create == 0:
        return 0, {name: count for _, name, count in cells}

    cur.execute('SELECT "Name" FROM church_members WHERE "ChurchId" = %s', (church_id,))
    reserved = {row[0].lower() for row in cur.fetchall() if row[0]}

    names = unique_names(to_create, reserved)
    occupations = [OCCUPATIONS[i % len(OCCUPATIONS)] for i in range(to_create)]
    random.shuffle(occupations)
    responsiveness = [RESPONSIVENESS_LEVELS[i % len(RESPONSIVENESS_LEVELS)] for i in range(to_create)]
    random.shuffle(responsiveness)

    created = 0
    name_iter = iter(names)

    for cell_id, count in targets.items():
        for _ in range(count):
            name = next(name_iter)
            profile = member_profile(created + 1, name, occupations[created], responsiveness[created])
            insert_member(cur, church_id, cell_id, profile, now)
            created += 1

    final_counts = {}
    for cell_id, name, _ in cells:
        cur.execute(
            'SELECT COUNT(*) FROM church_members WHERE "ChurchId" = %s AND "ParentNodeId" = %s',
            (church_id, cell_id),
        )
        final_counts[name] = int(cur.fetchone()[0])

    return created, final_counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo members for Canada Church.")
    parser.add_argument("--connection", help="Postgres URI (defaults to .env ConnectionStrings__Default)")
    parser.add_argument("--church-name", default=DEFAULT_CHURCH_NAME)
    parser.add_argument("--total", type=int, default=DEFAULT_TOTAL_MEMBERS, help="Target total members across all cells")
    parser.add_argument("--titans-min", type=int, default=TITANS_CELL_MIN, help=f"Minimum members in {TITANS_CELL_NAME}")
    parser.add_argument("--force", action="store_true", help="Top up to target even when church already has members")
    parser.add_argument("--seed", type=int, default=9032026)
    args = parser.parse_args()

    random.seed(args.seed)
    conn_str = pg_connect_url(args.connection or load_connection_string())
    now = datetime.now(timezone.utc)

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            church_id, church_name = find_church(cur, args.church_name)
            cells = list_cells(cur, church_id)
            existing = member_count(cur, church_id)

            print(f"{church_name} ({church_id})")
            print(f"  cells: {len(cells)}")
            for cell_id, name, count in cells:
                print(f"    - {name}: {count} members")

            if existing >= args.total and not args.force:
                titans_count = next((count for _, name, count in cells if name == TITANS_CELL_NAME), 0)
                if titans_count >= args.titans_min:
                    print(f"Already has {existing} members (target {args.total}). Use --force to top up.")
                    return
                print(f"Topping up {TITANS_CELL_NAME} only ({titans_count} -> {args.titans_min})")

            created, final_counts = seed_members(
                cur,
                church_id,
                cells,
                args.total if args.force else max(args.total, existing + 1),
                args.titans_min,
                now,
            )
            leaders = assign_leaders(cur, church_id)
            conn.commit()

            total = member_count(cur, church_id)
            print(f"\nSeeded {created} new members ({total} total)")
            print("Cell counts:")
            for name, count in sorted(final_counts.items()):
                marker = "  <-- demo cell" if name == TITANS_CELL_NAME else ""
                print(f"  - {name}: {count}{marker}")
            print(
                f"Leaders: {leaders['fellowship']} fellowship, {leaders['cell']} cell, {leaders['pfcc']} PFCC"
            )


if __name__ == "__main__":
    main()
