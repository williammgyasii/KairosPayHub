#!/usr/bin/env python3
"""Seed structure, members, leaders, and giving data for a pastor demo."""

from __future__ import annotations

import argparse
import itertools
import random
import subprocess
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

NEON_PROD_PROJECT = "wandering-snow-35159158"
NEON_PROD_DATABASE = "kairospayhub"
NEON_PROD_BRANCH = "br-cool-math-ayvecc3l"

FIRST_NAMES = [
    "Marcus", "Daniel", "Samuel", "Michael", "David", "James", "Robert", "William",
    "Sarah", "Grace", "Ruth", "Esther", "Hannah", "Naomi", "Mary", "Elizabeth",
    "Jordan", "Taylor", "Alex", "Morgan", "Aisha", "Fatima", "Priya", "Chen",
    "Emily", "Olivia", "Ethan", "Noah", "Chloe", "Liam", "Ava", "Ryan",
]

LAST_NAMES = [
    "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore",
    "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
    "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall",
    "Boama", "Owusu", "Mensah", "Gyasi", "Campbell", "Fraser",
]

RESIDENCES = [
    "Columbus", "Dublin", "Westerville", "Grove City", "Hilliard", "Gahanna",
    "Upper Arlington", "Worthington", "Reynoldsburg", "Pickerington", "Powell",
]

SCHOOLS = [
    "Ohio State University", "Columbus State", "Nationwide", "JPMorgan Chase",
    "Honda", "Cardinal Health", "Self-employed", "Columbus City Schools",
]

OCCUPATIONS = [0, 1, 2, 3, 4]
RESPONSIVENESS_LEVELS = [1, 2, 3, 4, 5]

DEFAULT_STRUCTURE = [
    ("Renewal Fellowship", ["Grace Cell", "Faith Cell"]),
    ("Victory Fellowship", ["Hope Cell", "Unity Cell"]),
]

ATTACHMENT_KEY = "giving/seed/demo-payment.jpg"


def load_connection_string(production: bool = False) -> str:
    if ENV_PATH.exists():
        keys = (
            ["NEON_PROD_CONNECTION_STRING", "ConnectionStrings__Default"]
            if production
            else ["ConnectionStrings__Default", "NEON_PROD_CONNECTION_STRING"]
        )
        values: dict[str, str] = {}
        for line in ENV_PATH.read_text().splitlines():
            for key in keys:
                if line.startswith(f"{key}="):
                    values[key] = line.split("=", 1)[1].strip()
        if production and values.get("NEON_PROD_CONNECTION_STRING"):
            return values["NEON_PROD_CONNECTION_STRING"]
        if not production and values.get("ConnectionStrings__Default"):
            return values["ConnectionStrings__Default"]

    if production:
        result = subprocess.run(
            [
                "neonctl",
                "connection-string",
                "--project-id",
                NEON_PROD_PROJECT,
                "--database-name",
                NEON_PROD_DATABASE,
                "--branch",
                NEON_PROD_BRANCH,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        conn_str = result.stdout.strip()
        if conn_str.startswith("postgresql"):
            return conn_str

    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("ConnectionStrings__Default="):
                return line.split("=", 1)[1].strip()

    raise SystemExit(
        "No Postgres connection string found. Set ConnectionStrings__Default (dev) "
        "or NEON_PROD_CONNECTION_STRING (prod), or install neonctl for prod."
    )


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
    if row:
        return str(row[0]), row[1]

    cur.execute(
        """
        SELECT "Id", "Name"
        FROM church_tenants
        WHERE lower("Name") LIKE lower(%s)
        ORDER BY "CreatedAt" DESC
        LIMIT 1
        """,
        (f"%{church_name}%",),
    )
    row = cur.fetchone()
    if row:
        return str(row[0]), row[1]

    cur.execute('SELECT "Name" FROM church_tenants ORDER BY "CreatedAt" DESC LIMIT 10')
    recent = [r[0] for r in cur.fetchall()]
    raise SystemExit(
        f"Church not found: {church_name}. Recent churches: {', '.join(recent) or '(none)'}"
    )


def get_template_layers(cur, church_id: str) -> tuple[str, str]:
    cur.execute(
        """
        SELECT sl."Id", sl."StandardType"
        FROM structure_layers sl
        JOIN structure_templates st ON st."Id" = sl."TemplateId"
        WHERE st."ChurchId" = %s
        ORDER BY sl."SortOrder"
        """,
        (church_id,),
    )
    layers = {row[1]: str(row[0]) for row in cur.fetchall()}
    fellowship = layers.get("Fellowship")
    cell = layers.get("Cell")
    if not fellowship or not cell:
        raise SystemExit("Church needs a Fellowship → Cell structure template first.")
    return fellowship, cell


def pastor_auth_user_id(cur, church_id: str) -> str:
    cur.execute(
        """
        SELECT "AuthUserId"
        FROM role_assignments
        WHERE "ChurchId" = %s AND "Role" = 'Pastor'
        ORDER BY "IsPrimaryPastor" DESC, "CreatedAt"
        LIMIT 1
        """,
        (church_id,),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit("No pastor role assignment found for this church.")
    return str(row[0])


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


def node_count(cur, church_id: str) -> int:
    cur.execute('SELECT COUNT(*) FROM structure_nodes WHERE "ChurchId" = %s', (church_id,))
    return int(cur.fetchone()[0])


def member_count(cur, church_id: str) -> int:
    cur.execute('SELECT COUNT(*) FROM church_members WHERE "ChurchId" = %s', (church_id,))
    return int(cur.fetchone()[0])


def ensure_structure(
    cur,
    church_id: str,
    fellowship_layer_id: str,
    cell_layer_id: str,
    layout: list[tuple[str, list[str]]],
    now: datetime,
) -> int:
    if node_count(cur, church_id) > 0:
        return 0

    created = 0
    fellowship_num = 0
    cell_num = 0

    for fellowship_name, cell_names in layout:
        fellowship_num += 1
        fellowship_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO structure_nodes
                ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt", "UnitNumber")
            VALUES (%s, %s, %s, NULL, %s, %s, %s)
            """,
            (fellowship_id, church_id, fellowship_layer_id, fellowship_name, now, str(fellowship_num)),
        )
        created += 1

        for cell_name in cell_names:
            cell_num += 1
            cur.execute(
                """
                INSERT INTO structure_nodes
                    ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt", "UnitNumber")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), church_id, cell_layer_id, fellowship_id, cell_name, now, str(cell_num)),
            )
            created += 1

    return created


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


def member_profile(idx: int, name: str, occupation: int, responsiveness: int, email_domain: str) -> dict:
    year = random.randint(1975, 2004)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    slug = name.lower().replace(" ", ".")
    area = random.choice(["614", "380", "740"])
    return {
        "name": name,
        "email": f"{slug}.{idx:03d}@{email_domain}",
        "phone": f"+1{area}{random.randint(2000000, 9999999)}",
        "age": 2026 - year,
        "date_of_birth": date(year, month, day),
        "residence": random.choice(RESIDENCES),
        "occupation": occupation,
        "school": random.choice(SCHOOLS),
        "responsiveness": responsiveness,
    }


def insert_member(cur, church_id: str, cell_id: str, profile: dict, now: datetime) -> str:
    member_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO church_members
            ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Phone",
             "Age", "DateOfBirth", "Residence", "OccupationStatus",
             "SchoolOrWorkplace", "Position", "Responsiveness", "CreatedAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            member_id,
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
    return member_id


def assign_leaders(cur, church_id: str) -> dict[str, int]:
    counts = {"fellowship": 0, "cell": 0}

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

    return counts


def seed_members(
    cur,
    church_id: str,
    cells: list[tuple[str, str, int]],
    total_target: int,
    email_domain: str,
    now: datetime,
) -> tuple[int, dict[str, int]]:
    existing_total = sum(count for _, _, count in cells)
    to_create = max(0, total_target - existing_total)
    if to_create == 0:
        return 0, {name: count for _, name, count in cells}

    per_cell = to_create // len(cells)
    extra = to_create % len(cells)
    targets = {
        cell_id: per_cell + (1 if index < extra else 0)
        for index, (cell_id, _, _) in enumerate(cells)
    }

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
            profile = member_profile(created + 1, name, occupations[created], responsiveness[created], email_domain)
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


def ensure_giving_program(cur, church_id: str, pastor_id: str, title: str, now: datetime) -> str:
    cur.execute(
        """
        SELECT "Id" FROM giving_programs
        WHERE "ChurchId" = %s AND "Title" = %s
        ORDER BY "CreatedAt" DESC
        LIMIT 1
        """,
        (church_id, title),
    )
    row = cur.fetchone()
    if row:
        return str(row[0])

    program_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO giving_programs
            ("Id", "ChurchId", "GivingType", "Title", "PeriodLabel", "ScopeKind",
             "Status", "ApprovalStatus", "CreatedByAuthUserId", "CreatedAt", "SortOrder")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            program_id,
            church_id,
            "SpecialProgram",
            title,
            "2026",
            "ChurchWide",
            "Open",
            0,  # ProgramApprovalStatus.Approved
            pastor_id,
            now,
            0,
        ),
    )
    return program_id


def seed_contributions(
    cur,
    church_id: str,
    program_id: str,
    pastor_id: str,
    currency: str,
    count: int,
    now: datetime,
) -> tuple[int, int, float]:
    cur.execute(
        """
        SELECT COUNT(*) FROM contributions c
        JOIN giving_programs gp ON gp."Id" = c."ProgramId"
        WHERE gp."ChurchId" = %s AND gp."Id" = %s
        """,
        (church_id, program_id),
    )
    existing = int(cur.fetchone()[0])
    if existing >= count:
        return 0, 0, 0.0

    cur.execute(
        """
        SELECT "Id", "ParentNodeId", "Name"
        FROM church_members
        WHERE "ChurchId" = %s
        ORDER BY random()
        LIMIT %s
        """,
        (church_id, count),
    )
    members = cur.fetchall()
    if not members:
        return 0, 0, 0.0

    inserted = 0
    approved_total = 0.0
    pending = 0
    for index, (member_id, parent_node_id, member_name) in enumerate(members):
        amount = random.choice([50, 75, 100, 125, 150, 200, 250, 300, 500])
        status = "Approved" if index % 4 != 3 else "PendingApproval"
        day = min(28, 1 + index * 2)
        date_sent = datetime(2026, 9, day, 12, 0, tzinfo=timezone.utc)
        approved_at = now if status == "Approved" else None
        approved_by = pastor_id if status == "Approved" else None

        cur.execute(
            """
            INSERT INTO contributions (
                "Id", "ProgramId", "MemberId", "Amount", "Currency",
                "DateSent", "AttachmentKey", "Notes",
                "EnteredByAuthUserId", "MemberParentNodeId", "Status",
                "ApprovedByAuthUserId", "ApprovedAt", "CreatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s
            )
            """,
            (
                str(uuid.uuid4()),
                program_id,
                member_id,
                amount,
                currency,
                date_sent,
                ATTACHMENT_KEY,
                "Seeded demo contribution",
                pastor_id,
                parent_node_id,
                status,
                approved_by,
                approved_at,
                now,
            ),
        )
        inserted += 1
        if status == "Approved":
            approved_total += amount
        else:
            pending += 1
        print(f"  + {member_name}: {currency} {amount} ({status})")

    return inserted, pending, approved_total


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed pastor demo: structure, members, givings.")
    parser.add_argument("--connection", help="Postgres URI (overrides .env / neonctl)")
    parser.add_argument("--production", action="store_true", help="Use prod connection")
    parser.add_argument("--church-name", default="Columbus City Church")
    parser.add_argument("--email-domain", default="columbuscity.demo")
    parser.add_argument("--total-members", type=int, default=35)
    parser.add_argument("--giving-title", default="Building Fund 2026")
    parser.add_argument("--currency", default="USD")
    parser.add_argument("--contributions", type=int, default=12)
    parser.add_argument("--force-members", action="store_true", help="Top up to target member count")
    parser.add_argument("--seed", type=int, default=9052026)
    args = parser.parse_args()

    random.seed(args.seed)
    conn_str = pg_connect_url(args.connection or load_connection_string(args.production))
    now = datetime.now(timezone.utc)

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            church_id, church_name = find_church(cur, args.church_name)
            pastor_id = pastor_auth_user_id(cur, church_id)
            fellowship_layer, cell_layer = get_template_layers(cur, church_id)

            print(f"{church_name} ({church_id})")
            print(f"  pastor auth user: {pastor_id}")

            nodes_created = ensure_structure(
                cur, church_id, fellowship_layer, cell_layer, DEFAULT_STRUCTURE, now
            )
            if nodes_created:
                print(f"  created {nodes_created} structure nodes")

            cells = list_cells(cur, church_id)
            print(f"  cells: {len(cells)}")
            for cell_id, name, count in cells:
                print(f"    - {name}: {count} members")

            existing = member_count(cur, church_id)
            if existing >= args.total_members and not args.force_members:
                print(f"  already has {existing} members (target {args.total_members})")
                leaders = assign_leaders(cur, church_id)
                print(f"  leaders: {leaders['fellowship']} fellowship, {leaders['cell']} cell")
            else:
                created, final_counts = seed_members(
                    cur, church_id, cells, args.total_members, args.email_domain, now
                )
                leaders = assign_leaders(cur, church_id)
                print(f"\nSeeded {created} members ({member_count(cur, church_id)} total)")
                print("Cell counts:")
                for name, count in sorted(final_counts.items()):
                    print(f"  - {name}: {count}")
                print(f"Leaders: {leaders['fellowship']} fellowship, {leaders['cell']} cell")

            program_id = ensure_giving_program(cur, church_id, pastor_id, args.giving_title, now)
            print(f"\nGiving program: {args.giving_title} ({program_id})")
            inserted, pending, approved_total = seed_contributions(
                cur, church_id, program_id, pastor_id, args.currency, args.contributions, now
            )
            if inserted:
                print(f"Contributions: {inserted} seeded ({args.currency} {approved_total:.0f} approved, {pending} pending)")
            else:
                print("Contributions: already seeded")

            conn.commit()

    print("\nDone. Log in as the pastor at https://app.kairospayhub.com")


if __name__ == "__main__":
    main()
