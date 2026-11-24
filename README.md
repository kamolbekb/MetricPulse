# MetricPulse — Fullstack SaaS Analytics & Team Workspace

A production-grade SaaS Analytics & Team Workspace Dashboard built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Recharts**, **FastAPI**, **SQLAlchemy**, **Pydantic v2**, and **PostgreSQL** (with automatic SQLite fallback for instant zero-config local development).

---

## Highlights

- **JWT Auth & Role-Based Access Control (RBAC):**
  - Full Login and Registration flows + prominent **One-Click Demo Admin** and **One-Click Demo Viewer** buttons on `/login` (plus a live role switcher in the topbar).
  - **Viewer** role: view executive analytics, filter/sort customers, and export filtered CSVs.
  - **Admin** role: everything Viewer can do, plus invite/remove team members, change member roles (`Admin` / `Editor` / `Viewer`), and persist workspace settings.
- **Executive Overview Dashboard (`/`):**
  - 4 KPI cards (**Monthly Recurring Revenue**, **Active Users**, **Churn Rate**, **Net Revenue Retention**) with period-over-period percentage change badges.
  - Interactive **Revenue vs. Expenses** area chart with `7d`, `30d`, `90d`, and `12m` timeframe switching.
  - **User Acquisition by Channel** visualization with Bar / Donut view toggle and CAC/conversion tooltips.
  - Active MRR breakdown by plan tier (`Enterprise`, `Pro`, `Starter`).
- **Customers & Subscriptions Table (`/customers`):**
  - 64 automatically seeded B2B SaaS accounts with search, Status filter (`Active`, `Trial`, `Churned`), Plan filter (`Starter`, `Pro`, `Enterprise`), multi-column sorting, and server-side pagination.
  - Working **Export to CSV** button that streams the currently filtered dataset directly from FastAPI (`/api/customers/export`).
- **Team Management (`/team`) & Workspace Settings (`/settings`):**
  - Member directory with role badges, Invite Member modal, persisted inline role updates, and member removal.
  - Editable workspace configuration (name, slug, billing email, currency, NRR target, timezone) protected by Admin RBAC.
- **Modern SaaS Polish:**
  - Linear/Vercel-inspired hairline borders, `tabular-nums` typography, collapsible desktop sidebar, responsive mobile drawer, Dark/Light mode toggle, loading skeletons, and toast notifications.

---

## Project Structure

```text
MetricPulse/
├── docker-compose.yml        # PostgreSQL + FastAPI + Next.js stack
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, auto-seeding lifespan
│   │   ├── config.py         # Pydantic Settings (PostgreSQL / SQLite fallback)
│   │   ├── database.py       # SQLAlchemy engine & session management
│   │   ├── models.py         # Workspace, User, DailyMetric, AcquisitionChannel, Customer
│   │   ├── schemas.py        # Pydantic v2 request/response schemas
│   │   ├── auth.py           # PBKDF2-SHA256 hashing, JWT, RBAC dependencies
│   │   ├── seed.py           # Idempotent 12-month metrics + 64 B2B customers seeder
│   │   └── routers/          # auth.py, analytics.py, customers.py, team.py, workspace.py
│   └── tests/
│       └── test_api.py       # End-to-end API & RBAC test suite
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/              # App Router pages (/, /customers, /team, /settings, /login, /register)
        ├── components/       # Dashboard charts, KPI cards, sidebar/topbar, modal, toast, skeletons
        ├── contexts/         # AuthContext & ThemeContext
        └── lib/              # Typed API client & formatters
```

---

## Quick Start (Local Dev — Zero Database Setup Required)

The backend automatically falls back to a local SQLite database (`backend/metricpulse.db`) and seeds 365 days of SaaS metrics, 8 team members, 6 acquisition channels, and 64 B2B customers on first startup.

### 1. Start the FastAPI Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs`.

### 2. Start the Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` and click **Demo Admin** or **Demo Viewer** on the login page.

### Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Demo Admin** | `admin@metricpulse.io` | `password123` |
| **Demo Viewer** | `viewer@metricpulse.io` | `password123` |

---

## Running with Docker Compose (PostgreSQL + Backend + Frontend)

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Running Backend Tests

```bash
cd backend
pytest -v
```

---

## Deployment Guide

### Backend on Render or Railway

1. Create a **PostgreSQL** database service on Render or Railway.
2. Create a Web Service pointing to the `backend/` directory (or using `backend/Dockerfile`).
3. Set environment variables:
   - `DATABASE_URL`: Your managed Postgres connection string (`postgres://...` and `postgresql://...` are automatically normalized to `postgresql+psycopg://`).
   - `JWT_SECRET_KEY`: A strong random 32+ character secret.
   - `CORS_ORIGINS`: Your production frontend URL (e.g., `https://metricpulse.vercel.app`).
4. Start command (if not using Docker):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Frontend on Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your deployed FastAPI backend URL (e.g., `https://metricpulse-api.onrender.com`).
3. Deploy — Next.js App Router builds automatically with `npm run build`.
