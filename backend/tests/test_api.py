import csv
import io
import os
import tempfile
from fastapi.testclient import TestClient

# Use an isolated temporary SQLite DB for tests
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db.name}"

from app.main import app  # noqa: E402


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_and_demo_auth_and_rbac():
    with TestClient(app) as client:
        # Health
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # Demo Admin login
        admin_res = client.post("/api/auth/demo", json={"role": "Admin"})
        assert admin_res.status_code == 200
        admin_data = admin_res.json()
        assert admin_data["user"]["role"] == "Admin"
        admin_token = admin_data["access_token"]

        # Demo Viewer login
        viewer_res = client.post("/api/auth/demo", json={"role": "Viewer"})
        assert viewer_res.status_code == 200
        viewer_data = viewer_res.json()
        assert viewer_data["user"]["role"] == "Viewer"
        viewer_token = viewer_data["access_token"]

        # Register new user
        reg_res = client.post(
            "/api/auth/register",
            json={
                "full_name": "Jordan Blake",
                "email": "jordan.blake@example.com",
                "password": "securepassword123",
                "title": "Data Analyst",
            },
        )
        assert reg_res.status_code == 201
        assert reg_res.json()["user"]["role"] == "Viewer"

        # Analytics across all 4 ranges
        for rng in ("7d", "30d", "90d", "12m"):
            ov = client.get(f"/api/analytics/overview?range={rng}", headers=_auth_header(viewer_token))
            assert ov.status_code == 200
            body = ov.json()
            assert body["range"] == rng
            assert len(body["kpis"]) == 4
            assert len(body["revenue_series"]) > 0
            assert len(body["acquisition_channels"]) == 6

        # Customers pagination, filter, search, sort
        cust = client.get(
            "/api/customers?status=Active&plan=Enterprise&sort_by=mrr&sort_dir=desc&page=1&page_size=10",
            headers=_auth_header(viewer_token),
        )
        assert cust.status_code == 200
        cust_body = cust.json()
        assert cust_body["total"] >= 1
        for item in cust_body["items"]:
            assert item["status"] == "Active"
            assert item["plan"] == "Enterprise"

        # Verify total seeded customers >= 50
        all_cust = client.get("/api/customers?page=1&page_size=10", headers=_auth_header(viewer_token))
        assert all_cust.status_code == 200
        assert all_cust.json()["total"] >= 50

        # CSV export respects filters & works for Viewer
        csv_res = client.get(
            "/api/customers/export?status=Active&plan=Enterprise",
            headers=_auth_header(viewer_token),
        )
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        rows = list(csv.DictReader(io.StringIO(csv_res.text)))
        assert len(rows) == cust_body["total"]
        assert all(r["Status"] == "Active" and r["Plan"] == "Enterprise" for r in rows)

        # RBAC: Viewer cannot invite or edit workspace settings
        viewer_invite = client.post(
            "/api/team/invite",
            json={
                "full_name": "Blocked User",
                "email": "blocked@example.com",
                "role": "Editor",
            },
            headers=_auth_header(viewer_token),
        )
        assert viewer_invite.status_code == 403

        viewer_ws = client.patch(
            "/api/workspace",
            json={"name": "Unauthorized Rename"},
            headers=_auth_header(viewer_token),
        )
        assert viewer_ws.status_code == 403

        # Admin can invite, toggle role, remove member, and edit workspace settings
        inv = client.post(
            "/api/team/invite",
            json={
                "full_name": "Taylor Reid",
                "email": "taylor.reid@metricpulse.io",
                "role": "Viewer",
                "title": "Revenue Analyst",
                "department": "Finance",
            },
            headers=_auth_header(admin_token),
        )
        assert inv.status_code == 201
        invited_id = inv.json()["id"]

        role_up = client.patch(
            f"/api/team/{invited_id}/role",
            json={"role": "Editor"},
            headers=_auth_header(admin_token),
        )
        assert role_up.status_code == 200
        assert role_up.json()["role"] == "Editor"

        del_res = client.delete(f"/api/team/{invited_id}", headers=_auth_header(admin_token))
        assert del_res.status_code == 200
        assert del_res.json()["removed"] is True

        ws_up = client.patch(
            "/api/workspace",
            json={"name": "MetricPulse Cloud", "nrr_target": 122.0},
            headers=_auth_header(admin_token),
        )
        assert ws_up.status_code == 200
        assert ws_up.json()["name"] == "MetricPulse Cloud"
        assert ws_up.json()["nrr_target"] == 122.0
