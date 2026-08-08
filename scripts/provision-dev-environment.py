#!/usr/bin/env python3
"""Provision KairosPayHub dev environment on Render + Cloudflare DNS."""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

RENDER_BASE = "https://api.render.com/v1"
CF_BASE = "https://api.cloudflare.com/client/v4"
OWNER_ID = "tea-d9qiro1t0dsc738536ng"
REPO = "https://github.com/williammgyasii/KairosPayHub"
PROD_API_ID = "srv-d9r55e3m8hqs739tni7g"
DEV_R2_PUBLIC_URL = "https://pub-5ef33570fdf846e1b06ea12dffef67ed.r2.dev"


def request(method: str, url: str, token: str, body: dict | list | None = None, cf: bool = False):
    data = None
    if body is not None:
        data = json.dumps(body).encode()
    headers = {"Accept": "application/json"}
    if cf:
        headers["X-Auth-Email"] = os.environ["CLOUDFLARE_EMAIL"]
        headers["X-Auth-Key"] = os.environ["CLOUDFLARE_API_KEY"]
    else:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {url} -> {e.code}: {err}") from e


def list_services(token: str):
    status, data = request("GET", f"{RENDER_BASE}/services?limit=50", token)
    return [item["service"] for item in data]


def find_service(services, name: str):
    return next((s for s in services if s["name"] == name), None)


def list_postgres(token: str):
    status, data = request("GET", f"{RENDER_BASE}/postgres?limit=50", token)
    return [item["postgres"] for item in data]


def create_postgres(token: str):
    body = {
        "name": "kairospayhub-db-dev",
        "ownerId": OWNER_ID,
        "plan": "basic_256mb",
        "region": "ohio",
        "version": "16",
        "databaseName": "kairospayhub_dev",
        "databaseUser": "kairos_dev",
    }
    status, data = request("POST", f"{RENDER_BASE}/postgres", token, body)
    print(f"Created Postgres: {data['id']}")
    return data


def wait_postgres(token: str, postgres_id: str, timeout_s: int = 900):
    start = time.time()
    while time.time() - start < timeout_s:
        status, data = request("GET", f"{RENDER_BASE}/postgres/{postgres_id}", token)
        state = data.get("status")
        print(f"Postgres status: {state}")
        if state == "available":
            return data
        if state in {"failed", "suspended"}:
            raise RuntimeError(f"Postgres failed: {state}")
        time.sleep(15)
    raise TimeoutError("Postgres did not become available in time")


def postgres_connection(token: str, postgres_id: str, *, internal: bool = True):
    status, data = request("GET", f"{RENDER_BASE}/postgres/{postgres_id}/connection-info", token)
    key = "internalConnectionString" if internal else "externalConnectionString"
    return data[key]


def get_env_vars(token: str, service_id: str):
    status, data = request("GET", f"{RENDER_BASE}/services/{service_id}/env-vars?limit=100", token)
    return {item["envVar"]["key"]: item["envVar"]["value"] for item in data}


def build_dev_env(prod_env: dict[str, str], connection_string: str) -> list[dict[str, str]]:
    dev_jwt = secrets.token_urlsafe(48)
    overrides = {
        "ASPNETCORE_ENVIRONMENT": "Production",
        "DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE": "false",
        "Database__MigrateOnStartup": "true",
        "ConnectionStrings__Default": connection_string,
        "Cors__Origins__0": "https://dev.app.kairospayhub.com",
        "Cors__Origins__1": "http://127.0.0.1:5173",
        "Jwt__Issuer": "https://dev.api.kairospayhub.com",
        "Jwt__Audience": "kairospayhub-dev",
        "Jwt__SigningKey": dev_jwt,
        "Email__FrontendBaseUrl": "https://dev.app.kairospayhub.com",
        "Email__FromName": "KairosPayHub (Dev)",
        "R2__BucketName": "kairospayhub-assets-dev",
        "R2__PublicBaseUrl": DEV_R2_PUBLIC_URL,
    }

    keys_to_copy = [
        "Email__FromAddress",
        "Email__Smtp__Host",
        "Email__Smtp__Port",
        "Email__Smtp__Username",
        "Email__Smtp__Password",
        "Email__Smtp__UseTls",
        "R2__AccessKeyId",
        "R2__SecretAccessKey",
        "R2__Endpoint",
    ]

    env: dict[str, str] = {}
    for key in keys_to_copy:
        if key in prod_env and prod_env[key]:
            env[key] = prod_env[key]
    env.update(overrides)
    return [{"key": k, "value": v} for k, v in sorted(env.items())]


def create_api_dev(token: str, env_vars: list[dict[str, str]]):
    body = {
        "type": "web_service",
        "name": "kairospayhub-api-dev",
        "ownerId": OWNER_ID,
        "repo": REPO,
        "branch": "develop",
        "rootDir": "kairospayhub-api",
        "autoDeploy": "yes",
        "envVars": env_vars,
        "serviceDetails": {
            "runtime": "docker",
            "env": "docker",
            "plan": "starter",
            "region": "ohio",
            "healthCheckPath": "/health",
            "envSpecificDetails": {
                "dockerfilePath": "./Dockerfile",
                "dockerContext": ".",
                "dockerCommand": "",
            },
        },
    }
    status, data = request("POST", f"{RENDER_BASE}/services", token, body)
    service = data["service"]
    print(f"Created API dev service: {service['id']} -> {service['serviceDetails']['url']}")
    return service


def create_frontend_dev(token: str):
    body = {
        "type": "static_site",
        "name": "kairospayhub-frontend-dev",
        "ownerId": OWNER_ID,
        "repo": REPO,
        "branch": "develop",
        "rootDir": "kairospayhub-frontend",
        "autoDeploy": "yes",
        "envVars": [{"key": "VITE_API_URL", "value": "https://dev.api.kairospayhub.com"}],
        "serviceDetails": {
            "buildCommand": "npm ci && npm test && npm run build",
            "publishPath": "dist",
            "routes": [{"type": "rewrite", "source": "/*", "destination": "/index.html"}],
        },
    }
    status, data = request("POST", f"{RENDER_BASE}/services", token, body)
    service = data["service"]
    print(f"Created frontend dev service: {service['id']} -> {service['serviceDetails']['url']}")
    return service


def ensure_custom_domain(token: str, service_id: str, domain: str):
    status, data = request("GET", f"{RENDER_BASE}/services/{service_id}/custom-domains", token)
    existing = {item["customDomain"]["name"] for item in data}
    if domain in existing:
        print(f"Custom domain already exists: {domain}")
        return
    request("POST", f"{RENDER_BASE}/services/{service_id}/custom-domains", token, {"name": domain})
    print(f"Added custom domain: {domain}")


def ensure_dns_cname(zone_id: str, name: str, target: str):
    fqdn = name if name.endswith(".kairospayhub.com") else f"{name}.kairospayhub.com"
    status, data = request(
        "GET",
        f"{CF_BASE}/zones/{zone_id}/dns_records?name={fqdn}",
        "",
        cf=True,
    )
    records = data.get("result", [])
    if records:
        rec = records[0]
        if rec["content"] == target and rec["proxied"] is False:
            print(f"DNS OK: {fqdn} -> {target}")
            return
        request(
            "PATCH",
            f"{CF_BASE}/zones/{zone_id}/dns_records/{rec['id']}",
            "",
            {"type": "CNAME", "name": fqdn, "content": target, "proxied": False, "ttl": 1},
            cf=True,
        )
        print(f"Updated DNS: {fqdn} -> {target}")
        return

    request(
        "POST",
        f"{CF_BASE}/zones/{zone_id}/dns_records",
        "",
        {"type": "CNAME", "name": fqdn, "content": target, "proxied": False, "ttl": 1},
        cf=True,
    )
    print(f"Created DNS: {fqdn} -> {target}")


def main() -> int:
    token = os.environ.get("RENDER_API_KEY")
    zone_id = os.environ.get("CLOUDFLARE_ZONE_ID")
    if not token or not zone_id:
        print("Missing RENDER_API_KEY or CLOUDFLARE_ZONE_ID", file=sys.stderr)
        return 1

    services = list_services(token)
    postgres_list = list_postgres(token)

    db = next((p for p in postgres_list if p["name"] == "kairospayhub-db-dev"), None)
    if not db:
        db = create_postgres(token)
    else:
        print(f"Using existing Postgres: {db['id']}")

    if db.get("status") != "available":
        db = wait_postgres(token, db["id"])
    connection_string = postgres_connection(token, db["id"])

    prod_env = get_env_vars(token, PROD_API_ID)
    dev_env = build_dev_env(prod_env, connection_string)

    api_dev = find_service(services, "kairospayhub-api-dev")
    if not api_dev:
        api_dev = create_api_dev(token, dev_env)
    else:
        print(f"Updating env vars on existing API dev: {api_dev['id']}")
        request("PUT", f"{RENDER_BASE}/services/{api_dev['id']}/env-vars", token, dev_env)

    frontend_dev = find_service(services, "kairospayhub-frontend-dev")
    if not frontend_dev:
        frontend_dev = create_frontend_dev(token)
    else:
        print(f"Using existing frontend dev: {frontend_dev['id']}")

    ensure_custom_domain(token, api_dev["id"], "dev.api.kairospayhub.com")
    ensure_custom_domain(token, frontend_dev["id"], "dev.app.kairospayhub.com")

    ensure_dns_cname(zone_id, "dev.api", api_dev["serviceDetails"]["url"].replace("https://", ""))
    ensure_dns_cname(
        zone_id,
        "dev.app",
        frontend_dev["serviceDetails"]["url"].replace("https://", ""),
    )

    print("\nDone.")
    print(f"Dev API: {api_dev['serviceDetails']['url']}")
    print(f"Dev app: {frontend_dev['serviceDetails']['url']}")
    print("Custom domains: dev.api.kairospayhub.com, dev.app.kairospayhub.com")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
