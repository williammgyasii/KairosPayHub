#!/usr/bin/env python3
"""Seed fellowships, cells, bible-study groups, and members for The Powerhouse church (dev)."""

from __future__ import annotations

import argparse
import os
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

CHURCH_ID = "36a46dbc-0961-43c7-a037-f5a9fd84ca57"
PFCC_NODES = [
    ("0e0d7d28-664a-4603-994e-5ba476db7823", "PFCC 1"),
    ("070c8f35-bea5-4a1f-bf78-758d0af720ef", "PFCC 2"),
    ("ff90fe29-23e4-4fd5-8417-ae3fb7199117", "PFCC 3"),
]
LAYER_FELLOWSHIP = "377532ce-df7b-4155-a749-5c4d3444eb80"
LAYER_CELL = "43c9c453-892f-475e-b526-cfaaed42a172"
LAYER_BIBLE_STUDY = "7bf046a4-c1e6-45fc-bdf5-7a2cd05482f5"

FELLOWSHIP_NAMES = [
    "Zion Fellowship",
    "Bethel Fellowship",
    "Emmanuel Fellowship",
    "Shiloh Fellowship",
    "Harvest Fellowship",
    "Dominion Fellowship",
    "Overflow Fellowship",
    "Radiance Fellowship",
    "Conquerors Fellowship",
    "Champions Fellowship",
    "Pioneers Fellowship",
    "Legacy Fellowship",
]

FIRST_NAMES = [
    "Kwame", "Kofi", "Yaw", "Emmanuel", "Daniel", "Samuel", "Joseph", "Michael",
    "Benjamin", "Prince", "Ama", "Akosua", "Abena", "Efua", "Grace", "Mary",
    "Sarah", "Ruth", "Esther", "Deborah", "Isaac", "David", "Joshua", "Naomi",
    "Hannah", "Felicia", "Gloria", "Patricia", "Elizabeth", "Cynthia", "Regina",
    "Victoria", "Angela", "Comfort", "Blessing", "Joy", "Faith", "Hope", "Mercy",
]

LAST_NAMES = [
    "Mensah", "Owusu", "Asante", "Boateng", "Osei", "Amoah", "Appiah", "Darko",
    "Gyasi", "Agyeman", "Sarpong", "Tetteh", "Quaye", "Annan", "Adjei", "Bonsu",
]

RESIDENCES = ["Accra", "Kumasi", "Tema", "Takoradi", "Cape Coast", "Tamale", "Legon"]
SCHOOLS = ["University of Ghana", "KNUST", "Ashesi University", "GIMPA", "UCC"]
OCCUPATIONS = [0, 1, 2, 3, 4]  # Student, Working, StudentAndWorking, Unemployed, Other

FELLOWSHIPS_PER_PFCC = 4
CELLS_PER_FELLOWSHIP = 2
GROUPS_PER_CELL = 2
MEMBERS_PER_GROUP = 3  # 4 * 3 * 2 * 2 * 3 = 144 members


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


def random_member(idx: int) -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"
    year = random.randint(1985, 2005)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return {
        "name": name,
        "email": f"member{idx:03d}@powerhouse.dev",
        "phone": f"+23324{random.randint(1000000, 9999999)}",
        "age": 2026 - year,
        "date_of_birth": date(year, month, day),
        "residence": random.choice(RESIDENCES),
        "occupation": random.choice(OCCUPATIONS),
        "school": random.choice(SCHOOLS),
        "responsiveness": random.choices([1, 2, 3, 4, 5], weights=[5, 10, 35, 30, 20])[0],
    }


def collect_subtree_node_ids(cur, church_id: str, root_id: str) -> list[str]:
    cur.execute(
        """
        SELECT "Id", "ParentNodeId"
        FROM structure_nodes
        WHERE "ChurchId" = %s
        """,
        (church_id,),
    )
    links = {row[0]: row[1] for row in cur.fetchall()}
    ids = [root_id]
    queue = [root_id]
    while queue:
        parent_id = queue.pop(0)
        for node_id, parent_node_id in links.items():
            if parent_node_id == parent_id and node_id not in ids:
                ids.append(node_id)
                queue.append(node_id)
    return ids


def first_member_in_subtree(cur, church_id: str, root_node_id: str) -> str | None:
    node_ids = collect_subtree_node_ids(cur, church_id, root_node_id)
    if not node_ids:
        return None
    cur.execute(
        """
        SELECT "Id"
        FROM church_members
        WHERE "ChurchId" = %s AND "ParentNodeId" = ANY(%s)
        ORDER BY "Name", "CreatedAt"
        LIMIT 1
        """,
        (church_id, node_ids),
    )
    row = cur.fetchone()
    return row[0] if row else None


def first_plain_member_in_subtree(cur, church_id: str, root_node_id: str) -> str | None:
    node_ids = collect_subtree_node_ids(cur, church_id, root_node_id)
    if not node_ids:
        return None
    cur.execute(
        """
        SELECT "Id"
        FROM church_members
        WHERE "ChurchId" = %s
          AND "ParentNodeId" = ANY(%s)
          AND "Position" = 'Member'
        ORDER BY "Name", "CreatedAt"
        LIMIT 1
        """,
        (church_id, node_ids),
    )
    row = cur.fetchone()
    return row[0] if row else None


def set_member_position(cur, member_id: str, position: str) -> None:
    cur.execute(
        'UPDATE church_members SET "Position" = %s WHERE "Id" = %s',
        (position, member_id),
    )


def set_node_leader(cur, node_id: str, member_id: str) -> None:
    cur.execute(
        'UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s',
        (member_id, node_id),
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
        member_id = first_member_in_subtree(cur, church_id, fellowship_id)
        if not member_id:
            continue
        set_member_position(cur, member_id, "FellowshipLeader")
        set_node_leader(cur, fellowship_id, member_id)
        counts["fellowship"] += 1

    cur.execute(
        """
        SELECT sn."Id"
        FROM structure_nodes sn
        JOIN structure_layers sl ON sl."Id" = sn."LayerId"
        WHERE sn."ChurchId" = %s AND sl."StandardType" = 'Cell' AND sl."DisplayName" = 'Cell'
        ORDER BY sn."Name"
        """,
        (church_id,),
    )
    for (cell_id,) in cur.fetchall():
        member_id = first_member_in_subtree(cur, church_id, cell_id)
        if not member_id:
            continue
        cur.execute(
            'SELECT "Position" FROM church_members WHERE "Id" = %s',
            (member_id,),
        )
        position = cur.fetchone()[0]
        if position == "Member":
            set_member_position(cur, member_id, "CellLeader")
        set_node_leader(cur, cell_id, member_id)
        counts["cell"] += 1

    for pfcc_id, _ in PFCC_NODES:
        member_id = first_plain_member_in_subtree(cur, church_id, pfcc_id)
        if member_id:
            set_member_position(cur, member_id, "PfccManager")
        else:
            cur.execute(
                """
                SELECT sn."LeaderMemberId"
                FROM structure_nodes sn
                JOIN structure_layers sl ON sl."Id" = sn."LayerId"
                WHERE sn."ChurchId" = %s
                  AND sn."ParentNodeId" = %s
                  AND sl."StandardType" = 'Fellowship'
                  AND sn."LeaderMemberId" IS NOT NULL
                ORDER BY sn."Name"
                LIMIT 1
                """,
                (church_id, pfcc_id),
            )
            row = cur.fetchone()
            member_id = row[0] if row else None
        if not member_id:
            continue
        set_node_leader(cur, pfcc_id, member_id)
        counts["pfcc"] += 1

    return counts


def seed_structure(cur, now: datetime) -> tuple[int, int]:
    fellowship_names = iter(FELLOWSHIP_NAMES)
    nodes_created = 0
    members_created = 0
    member_idx = 1

    for pfcc_id, _pfcc_label in PFCC_NODES:
        for _ in range(FELLOWSHIPS_PER_PFCC):
            fellowship_id = uuid.uuid4()
            fellowship_name = next(fellowship_names)
            cur.execute(
                """
                INSERT INTO structure_nodes
                    ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt")
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (fellowship_id, CHURCH_ID, LAYER_FELLOWSHIP, pfcc_id, fellowship_name, now),
            )
            nodes_created += 1

            for cell_num in range(1, CELLS_PER_FELLOWSHIP + 1):
                cell_id = uuid.uuid4()
                cell_name = f"{fellowship_name.split()[0]} Cell {cell_num}"
                cur.execute(
                    """
                    INSERT INTO structure_nodes
                        ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt", "UnitNumber")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (cell_id, CHURCH_ID, LAYER_CELL, fellowship_id, cell_name, now, str(cell_num)),
                )
                nodes_created += 1

                for group_num in range(1, GROUPS_PER_CELL + 1):
                    group_id = uuid.uuid4()
                    group_name = f"{cell_name} — Group {group_num}"
                    cur.execute(
                        """
                        INSERT INTO structure_nodes
                            ("Id", "ChurchId", "LayerId", "ParentNodeId", "Name", "CreatedAt")
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (group_id, CHURCH_ID, LAYER_BIBLE_STUDY, cell_id, group_name, now),
                    )
                    nodes_created += 1

                    for _ in range(MEMBERS_PER_GROUP):
                        m = random_member(member_idx)
                        cur.execute(
                            """
                            INSERT INTO church_members
                                ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Phone",
                                 "Age", "DateOfBirth", "Residence", "OccupationStatus",
                                 "SchoolOrWorkplace", "Position", "Responsiveness", "CreatedAt")
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                uuid.uuid4(),
                                CHURCH_ID,
                                group_id,
                                m["name"],
                                m["email"],
                                m["phone"],
                                m["age"],
                                m["date_of_birth"],
                                m["residence"],
                                m["occupation"],
                                m["school"],
                                "Member",
                                m["responsiveness"],
                                now,
                            ),
                        )
                        members_created += 1
                        member_idx += 1

    return nodes_created, members_created


def refresh_responsiveness(cur, church_id: str) -> int:
    cur.execute(
        'SELECT "Id" FROM church_members WHERE "ChurchId" = %s',
        (church_id,),
    )
    member_ids = [row[0] for row in cur.fetchall()]
    updated = 0
    for member_id in member_ids:
        score = random.choices([1, 2, 3, 4, 5], weights=[5, 10, 35, 30, 20])[0]
        cur.execute(
            'UPDATE church_members SET "Responsiveness" = %s WHERE "Id" = %s',
            (score, member_id),
        )
        updated += 1
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed The Powerhouse structure and members.")
    parser.add_argument(
        "--assign-leaders",
        action="store_true",
        help="Promote leaders on existing structure (fellowship, cell, PFCC).",
    )
    parser.add_argument(
        "--refresh-responsiveness",
        action="store_true",
        help="Assign responsiveness scores (1-5) to all Powerhouse members.",
    )
    args = parser.parse_args()

    random.seed(42)
    conn_str = pg_connect_url(load_connection_string())
    now = datetime.now(timezone.utc)

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            if args.assign_leaders:
                counts = assign_leaders(cur, CHURCH_ID)
                conn.commit()
                print("Assigned leaders for The Powerhouse:")
                print(f"  - {counts['fellowship']} fellowship leaders")
                print(f"  - {counts['cell']} cell leaders")
                print(f"  - {counts['pfcc']} PFCC managers")
                return

            if args.refresh_responsiveness:
                updated = refresh_responsiveness(cur, CHURCH_ID)
                conn.commit()
                print(f"Updated responsiveness for {updated} members in The Powerhouse.")
                return

            cur.execute(
                'SELECT COUNT(*) FROM structure_nodes sn '
                'JOIN structure_layers sl ON sl."Id" = sn."LayerId" '
                'WHERE sn."ChurchId" = %s AND sl."StandardType" = %s',
                (CHURCH_ID, "Fellowship"),
            )
            existing_fellowships = cur.fetchone()[0]
            if existing_fellowships > 0:
                print(f"Structure already seeded ({existing_fellowships} fellowships).")
                print("Run with --assign-leaders to promote leaders on existing data.")
                print("Run with --refresh-responsiveness to assign responsiveness scores to members.")
                return

            nodes_created, members_created = seed_structure(cur, now)
            leader_counts = assign_leaders(cur, CHURCH_ID)
            conn.commit()

            print("Seeded The Powerhouse:")
            print(f"  - {nodes_created} structure nodes (fellowships, cells, bible-study groups)")
            print(f"  - {members_created} members across the tree")
            print(f"  - {leader_counts['fellowship']} fellowship leaders")
            print(f"  - {leader_counts['cell']} cell leaders")
            print(f"  - {leader_counts['pfcc']} PFCC managers")
            print(f"  - Under {len(PFCC_NODES)} PFCCs × {FELLOWSHIPS_PER_PFCC} fellowships each")


if __name__ == "__main__":
    main()
