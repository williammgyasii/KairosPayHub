#!/usr/bin/env python3
"""Create a dev login for a fellowship leader (Powerhouse church)."""

from __future__ import annotations

import argparse
import subprocess
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
HASH_TOOL = ROOT / "scripts" / "hash-password" / "hash-password.csproj"
POWERHOUSE_CHURCH_ID = "36a46dbc-0961-43c7-a037-f5a9fd84ca57"
DEFAULT_FELLOWSHIP_NODE_ID = "1a15df31-3f9a-4fa7-80ee-6ea7d4df2722"  # Zion Fellowship


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", default="zion.fellowship@powerhouse.dev")
    parser.add_argument("--name", default="Zion Fellowship Leader")
    parser.add_argument("--password", default="DevPass123!")
    parser.add_argument("--fellowship-node-id", default=DEFAULT_FELLOWSHIP_NODE_ID)
    args = parser.parse_args()

    conn_str = load_connection_string()
    parsed = urlparse(conn_str)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise SystemExit(f"Unsupported DB scheme: {parsed.scheme}")

    auth_user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    password_hash = hash_password(args.password)

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = upper(%s)',
                (args.email,),
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """
                    UPDATE "AspNetUsers"
                    SET "PasswordHash" = %s, "DisplayName" = %s
                    WHERE "NormalizedEmail" = upper(%s)
                    """,
                    (password_hash, args.name, args.email),
                )
                cur.execute(
                    'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = upper(%s)',
                    (args.email,),
                )
                auth_user_id = cur.fetchone()[0]
            else:
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
                        args.email,
                        args.email,
                        args.email,
                        args.email,
                        password_hash,
                        str(uuid.uuid4()),
                        str(uuid.uuid4()),
                        args.name,
                    ),
                )

            cur.execute(
                """
                SELECT sn."Id", sn."Name", cm."Id"
                FROM structure_nodes sn
                LEFT JOIN church_members cm ON cm."Id" = sn."LeaderMemberId"
                WHERE sn."Id" = %s AND sn."ChurchId" = %s
                """,
                (args.fellowship_node_id, POWERHOUSE_CHURCH_ID),
            )
            row = cur.fetchone()
            if not row:
                raise SystemExit(f"Fellowship node not found: {args.fellowship_node_id}")
            _, fellowship_name, leader_member_id = row

            if leader_member_id is None:
                leader_member_id = uuid.uuid4()
                cur.execute(
                    """
                    INSERT INTO church_members
                        ("Id", "ChurchId", "ParentNodeId", "Name", "Email", "Position",
                         "AuthUserId", "CreatedAt")
                    VALUES
                        (%s, %s, %s, %s, %s, 'FellowshipLeader', %s, %s)
                    """,
                    (
                        leader_member_id,
                        POWERHOUSE_CHURCH_ID,
                        args.fellowship_node_id,
                        args.name,
                        args.email,
                        auth_user_id,
                        now,
                    ),
                )
                cur.execute(
                    'UPDATE structure_nodes SET "LeaderMemberId" = %s WHERE "Id" = %s',
                    (leader_member_id, args.fellowship_node_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE church_members
                    SET "Email" = %s, "Name" = %s, "Position" = 'FellowshipLeader', "AuthUserId" = %s
                    WHERE "Id" = %s
                    """,
                    (args.email, args.name, auth_user_id, leader_member_id),
                )

            cur.execute(
                """
                DELETE FROM role_assignments
                WHERE "ChurchId" = %s AND "AuthUserId" = %s AND "Role" = 'FellowshipLeader'
                """,
                (POWERHOUSE_CHURCH_ID, auth_user_id),
            )
            cur.execute(
                """
                INSERT INTO role_assignments
                    ("Id", "ChurchId", "AuthUserId", "Role", "ScopeNodeId", "CreatedAt")
                VALUES
                    (%s, %s, %s, 'FellowshipLeader', %s, %s)
                """,
                (uuid.uuid4(), POWERHOUSE_CHURCH_ID, auth_user_id, args.fellowship_node_id, now),
            )

        conn.commit()

    print(f"Fellowship leader login ready for {fellowship_name}:")
    print(f"  Email:    {args.email}")
    print(f"  Password: {args.password}")
    print("Sign out, then log in at http://127.0.0.1:5173/login")
    print("Open Attendance → Submissions to approve roll calls from cells in this fellowship.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
