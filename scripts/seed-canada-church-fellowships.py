#!/usr/bin/env python3
"""Seed Canada Church with 3 fellowships, leaders, members, and dev logins."""

from __future__ import annotations

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
HASH_TOOL = ROOT / "scripts" / "hash-password" / "hash-password.csproj"

CHURCH_NAME = "Canada Church"
EMAIL_DOMAIN = "canada-church.demo"
DEFAULT_PASSWORD = "BrightStar63@!"
MEMBERS_PER_CELL = 4

FELLOWSHIPS = [
    {
        "name": "Haven",
        "slug": "haven",
        "cells": [
            {"name": "Haven Cell 1", "slug": "cell1"},
            {"name": "Titans Cell", "slug": "cell2"},
        ],
    },
    {
        "name": "Grace",
        "slug": "grace",
        "cells": [
            {"name": "Grace Cell A", "slug": "cell1"},
            {"name": "Grace Cell B", "slug": "cell2"},
        ],
    },
    {
        "name": "Renewal",
        "slug": "renewal",
        "cells": [
            {"name": "Renewal Cell A", "slug": "cell1"},
            {"name": "Renewal Cell B", "slug": "cell2"},
        ],
    },
]

FIRST_NAMES = [
    "Amara", "Chidi", "Ngozi", "Kofi", "Daniel", "Sarah", "Michael", "Grace",
    "David", "Ruth", "Naomi", "Joshua", "Olivia", "Ethan", "Sophia", "Liam",
]
LAST_NAMES = [
    "Okafor", "Mensah", "Singh", "Williams", "Johnson", "Campbell", "MacDonald", "Tremblay",
]


def load_connection_string() -> str:
    if not ENV_PATH.exists():
        raise SystemExit(f"Missing {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("ConnectionStrings__Default="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ConnectionStrings__Default not found in .env")


def hash_password(password: str) -> str:
    result = subprocess.run(
        ["dotnet", "run", "--project", str(HASH_TOOL), "--", password],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def find_church(cur) -> tuple[str, str]:
    cur.execute(
        'SELECT "Id", "Name" FROM church_tenants WHERE lower("Name") = lower(%s) LIMIT 1',
        (CHURCH_NAME,),
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"Church not found: {CHURCH_NAME}")
    return str(row[0]), row[1]


def get_layers(cur, church_id: str) -> tuple[str, str]:
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
        raise SystemExit("Church needs Fellowship → Cell template.")
    return fellowship, cell


def next_unit_number(cur, church_id: str) -> int:
    cur.execute(
        """
        SELECT COALESCE(MAX(CAST("UnitNumber" AS int)), 0)
        FROM structure_nodes
        WHERE "ChurchId" = %s AND "UnitNumber" ~ '^[0-9]+$'
        """,
        (church_id,),
    )
    return int(cur.fetchone()[0]) + 1


def find_fellowship(cur, church_id: str, name: str) -> str | None:
    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Fellowship' AND sn."Name" = %s
        LIMIT 1
        """,
        (church_id, name),
    )
    row = cur.fetchone()
    return str(row[0]) if row else None


def find_cell(cur, church_id: str, name: str) -> str | None:
    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Cell' AND sn."Name" = %s
        LIMIT 1
        """,
        (church_id, name),
    )
    row = cur.fetchone()
    return str(row[0]) if row else None


def create_node(cur, church_id: str, layer_id: str, parent_id: str | None, name: str, unit: int, now: datetime) -> str:
    node_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO structure_nodes
            ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt", "UnitNumber")
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (node_id, church_id, layer_id, parent_id, name, now, str(unit)),
    )
    return node_id


def ensure_auth_user(cur, email: str, name: str, password_hash: str) -> str:
    cur.execute(
        'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = upper(%s)',
        (email,),
    )
    row = cur.fetchone()
    if row:
        auth_user_id = str(row[0])
        cur.execute(
            """
            UPDATE "AspNetUsers"
            SET "PasswordHash" = %s, "DisplayName" = %s, "EmailConfirmed" = true
            WHERE "Id" = %s
            """,
            (password_hash, name, auth_user_id),
        )
        return auth_user_id

    auth_user_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO "AspNetUsers"
            ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
             "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
             "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount",
             "DisplayName")
        VALUES
            (%s, %s, upper(%s), %s, upper(%s),
             true, %s, %s, %s,
             false, false, true, 0,
             %s)
        """,
        (
            auth_user_id,
            email,
            email,
            email,
            email,
            password_hash,
            str(uuid.uuid4()),
            str(uuid.uuid4()),
            name,
        ),
    )
    return auth_user_id


def upsert_role(cur, church_id: str, auth_user_id: str, role: str, scope_node_id: str, now: datetime) -> None:
    cur.execute(
        """
        DELETE FROM role_assignments
        WHERE "ChurchId" = %s AND "AuthUserId" = %s AND "Role" = %s
        """,
        (church_id, auth_user_id, role),
    )
    cur.execute(
        """
        INSERT INTO role_assignments
            ("Id", "ChurchId", "AuthUserId", "Role", "ScopeNodeId", "CreatedAt")
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (str(uuid.uuid4()), church_id, auth_user_id, role, scope_node_id, now),
    )


def upsert_leader(
    cur,
    church_id: str,
    node_id: str,
    parent_node_id: str,
    name: str,
    email: str,
    position: str,
    role: str,
    auth_user_id: str,
    password_hash: str,
    now: datetime,
) -> str:
    cur.execute('SELECT "LeaderMemberId" FROM structure_nodes WHERE "Id" = %s', (node_id,))
    row = cur.fetchone()
    leader_member_id = str(row[0]) if row and row[0] else None

    resolved_auth = ensure_auth_user(cur, email, name, password_hash)

    if leader_member_id:
        cur.execute(
            """
            UPDATE church_members
            SET "Name" = %s, "Email" = %s, "Position" = %s, "AuthUserId" = %s
            WHERE "Id" = %s
            """,
            (name, email, position, resolved_auth, leader_member_id),
        )
    else:
        leader_member_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO church_members
                ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Position", "AuthUserId", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (leader_member_id, church_id, parent_node_id, name, email, position, resolved_auth, now),
        )
        cur.execute(
            'UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s',
            (leader_member_id, node_id),
        )

    upsert_role(cur, church_id, resolved_auth, role, node_id, now)
    return leader_member_id


def seed_cell_members(cur, church_id: str, cell_id: str, count: int, slug: str, now: datetime) -> int:
    cur.execute(
        'SELECT COUNT(*) FROM church_members WHERE "ChurchId" = %s AND "ParentNodeId" = %s',
        (church_id, cell_id),
    )
    existing = int(cur.fetchone()[0])
    if existing >= count + 1:
        return 0

    needed = max(0, count - max(0, existing - 1))
    created = 0
    for i in range(needed):
        first = FIRST_NAMES[(created + i) % len(FIRST_NAMES)]
        last = LAST_NAMES[(created + i) % len(LAST_NAMES)]
        name = f"{first} {last}"
        email = f"{slug}.member{(existing + created + 1):02d}@{EMAIL_DOMAIN}"
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
                name,
                email,
                f"+1416555{1000 + existing + created:04d}",
                28,
                date(1998, 1, 15),
                "Toronto",
                1,
                "University of Toronto",
                "Member",
                3,
                now,
            ),
        )
        created += 1
    return created


def main() -> int:
    conn_str = load_connection_string()
    parsed = urlparse(conn_str)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise SystemExit(f"Unsupported DB scheme: {parsed.scheme}")

    password_hash = hash_password(DEFAULT_PASSWORD)
    now = datetime.now(timezone.utc)
    logins: list[tuple[str, str, str]] = []

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            church_id, church_name = find_church(cur)
            fellowship_layer, cell_layer = get_layers(cur, church_id)
            unit = next_unit_number(cur, church_id)

            print(f"Seeding {church_name} ({church_id})")

            for fellowship in FELLOWSHIPS:
                fellowship_id = find_fellowship(cur, church_id, fellowship["name"])
                if fellowship_id is None:
                    fellowship_id = create_node(
                        cur, church_id, fellowship_layer, None, fellowship["name"], unit, now
                    )
                    unit += 1
                    print(f"  + Fellowship: {fellowship['name']}")

                fl_email = f"{fellowship['slug']}.fellowship@{EMAIL_DOMAIN}"
                fl_name = f"{fellowship['name']} Leader"
                upsert_leader(
                    cur,
                    church_id,
                    fellowship_id,
                    fellowship_id,
                    fl_name,
                    fl_email,
                    "FellowshipLeader",
                    "FellowshipLeader",
                    "",
                    password_hash,
                    now,
                )
                logins.append((fellowship["name"], "Fellowship leader", fl_email))

                for cell in fellowship["cells"]:
                    cell_id = find_cell(cur, church_id, cell["name"])
                    if cell_id is None:
                        cell_id = create_node(
                            cur,
                            church_id,
                            cell_layer,
                            fellowship_id,
                            cell["name"],
                            unit,
                            now,
                        )
                        unit += 1
                        print(f"    + Cell: {cell['name']}")

                    cl_email = f"{fellowship['slug']}.{cell['slug']}@{EMAIL_DOMAIN}"
                    cl_name = f"{cell['name']} Leader"
                    upsert_leader(
                        cur,
                        church_id,
                        cell_id,
                        cell_id,
                        cl_name,
                        cl_email,
                        "CellLeader",
                        "CellLeader",
                        "",
                        password_hash,
                        now,
                    )
                    logins.append((fellowship["name"], cell["name"], cl_email))

                    added = seed_cell_members(
                        cur,
                        church_id,
                        cell_id,
                        MEMBERS_PER_CELL,
                        f"{fellowship['slug']}.{cell['slug']}",
                        now,
                    )
                    if added:
                        print(f"      + {added} members in {cell['name']}")

            cur.execute(
                """
                SELECT COUNT(*) FROM structure_nodes sn
                JOIN structure_layers sl ON sl."Id" = sn."LayerId"
                WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Fellowship'
                """,
                (church_id,),
            )
            fellowship_count = int(cur.fetchone()[0])
            cur.execute(
                'SELECT COUNT(*) FROM church_members WHERE "ChurchId" = %s',
                (church_id,),
            )
            member_count = int(cur.fetchone()[0])

        conn.commit()

    print(f"\nDone: {fellowship_count} fellowships, {member_count} total members")
    print(f"Password for all leader logins: {DEFAULT_PASSWORD}\n")
    print("Leader credentials:")
    for fellowship, role, email in logins:
        print(f"  [{fellowship}] {role}")
        print(f"    {email}")

    print("\nTry a fellowship leader:")
    print(f"  {logins[1][2]}")
    print(f"  {DEFAULT_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
