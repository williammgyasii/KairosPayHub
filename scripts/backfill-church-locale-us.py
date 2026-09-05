#!/usr/bin/env python3
"""Apply AddChurchCountryCurrency on prod if missing, then set US/USD on known churches."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

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
NEON_ORG = "org-round-water-13421232"

MIGRATION_ID = "20260905211652_AddChurchCountryCurrency"
PRODUCT_VERSION = "10.0.9"

CHURCHES_BY_ENV: dict[str, list[str]] = {
    "dev": ["Canada Church"],
    "prod": ["Columbus City Church", "Canada Int Ministries"],
}


def load_env_value(key: str) -> str | None:
    if not ENV_PATH.exists():
        return None
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return None


def prod_connection_string() -> str:
    value = load_env_value("NEON_PROD_CONNECTION_STRING")
    if value:
        return value
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
            "--org-id",
            NEON_ORG,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def connection_for(env: str) -> str:
    if env == "prod":
        return prod_connection_string()
    value = load_env_value("ConnectionStrings__Default")
    if not value:
        raise SystemExit("Set ConnectionStrings__Default in .env for dev")
    return value


def ensure_migration(cur) -> None:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'church_tenants' AND column_name = 'CountryCode'
        """
    )
    if cur.fetchone() is None:
        cur.execute(
            'ALTER TABLE church_tenants ADD COLUMN "CountryCode" character varying(2)'
        )
        cur.execute(
            """
            ALTER TABLE church_tenants
            ADD COLUMN "DefaultCurrency" character varying(3) NOT NULL DEFAULT 'GHS'
            """
        )
        cur.execute(
            """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (MIGRATION_ID, PRODUCT_VERSION),
        )
        print(f"Applied migration {MIGRATION_ID}")


def upgrade_churches(cur, names: list[str]) -> None:
    cur.execute(
        """
        UPDATE church_tenants
        SET "CountryCode" = 'US', "DefaultCurrency" = 'USD'
        WHERE "Name" = ANY(%s)
        RETURNING "Name", "CountryCode", "DefaultCurrency", "Location"
        """,
        (names,),
    )
    rows = cur.fetchall()
    if not rows:
        print("No matching churches updated.")
        return
    for name, code, currency, location in rows:
        print(f"  {name}: {code} / {currency} ({location or 'no location'})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", choices=["dev", "prod"], required=True)
    args = parser.parse_args()

    conn_str = connection_for(args.env)
    names = CHURCHES_BY_ENV[args.env]

    print(f"==> {args.env}: connecting")
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            if args.env == "prod":
                ensure_migration(cur)
            upgrade_churches(cur, names)
        conn.commit()
    print("Done.")


if __name__ == "__main__":
    main()
