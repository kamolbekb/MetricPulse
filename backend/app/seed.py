from datetime import date, datetime, timedelta, timezone
import math
import random
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import AcquisitionChannel, Customer, DailyMetric, User, Workspace

DEMO_ADMIN_EMAIL = "admin@metricpulse.io"
DEMO_VIEWER_EMAIL = "viewer@metricpulse.io"
DEMO_PASSWORD = "password123"

SEED_COMPANIES = [
    ("Northstar Cloud", "Rachel Kim", "United States", "Cloud Infrastructure"),
    ("Veridian Data", "Thomas Lindqvist", "Sweden", "Data Engineering"),
    ("Kestrel Security", "Amina Patel", "United Kingdom", "Cybersecurity"),
    ("Loomis Robotics", "Kenji Sato", "Japan", "Industrial Automation"),
    ("Aether Pay", "Claire Beaumont", "France", "FinTech"),
    ("Cinder Analytics", "David Morales", "United States", "Business Intelligence"),
    ("Vanguard Freight", "Henrik Olsen", "Norway", "Logistics Tech"),
    ("Helios Biotech", "Dr. Maya Lin", "Switzerland", "Life Sciences"),
    ("Stratos AI", "Daniel Okafor", "United States", "Applied AI"),
    ("Meridian Health", "Sarah Jenkins", "Canada", "HealthTech"),
    ("Polaris Commerce", "Lukas Weber", "Germany", "E-Commerce"),
    ("Redwood Legal", "Victoria Grant", "United States", "LegalTech"),
    ("Cobalt Energy", "Mateo Silva", "Spain", "CleanTech"),
    ("Halcyon Media", "Olivia Bennett", "Australia", "Digital Media"),
    ("Ironclad Supply", "Gavin Murphy", "Ireland", "Supply Chain"),
    ("Solstice Labs", "Nadia Mansour", "Netherlands", "Developer Tools"),
    ("Driftwood Travel", "Marco Rossi", "Italy", "TravelTech"),
    ("Keystone Finance", "Andrew Park", "United States", "WealthTech"),
    ("Vertex Systems", "Elena Petrova", "Germany", "Enterprise SaaS"),
    ("Boreal Networks", "Soren Lind", "Denmark", "Telecom"),
    ("Onyx Gaming", "Jason Wu", "South Korea", "Gaming"),
    ("Cascade Genomics", "Emily Zhao", "United States", "Biotech"),
    ("Trellis EdTech", "Benjamin Cole", "United Kingdom", "EdTech"),
    ("Summit Ventures", "Lauren Adams", "United States", "Venture Capital"),
    ("Quartz Payments", "Rafael Costa", "Brazil", "Payments"),
    ("Prism Design Co", "Chloe Martin", "Canada", "Creative Tools"),
    ("Veloce Mobility", "Giulia Conti", "Italy", "Mobility"),
    ("Harbor Maritime", "Willem De Vries", "Netherlands", "Maritime Tech"),
    ("Aurelia Retail", "Camille Laurent", "France", "Retail Tech"),
    ("Pinnacle HR", "Jordan Taylor", "United States", "HRTech"),
    ("Beacon Telemetry", "Samir Khanna", "India", "Observability"),
    ("Granite Construction", "Patrick Hughes", "Australia", "ConTech"),
    ("Nimbus Storage", "Hannah Richter", "Germany", "Cloud Storage"),
    ("Silverline Audio", "Felix Bergman", "Sweden", "Audio Tech"),
    ("Atlas Mapping", "Diego Herrera", "Mexico", "Geospatial"),
    ("Evergreen Foods", "Grace O'Neill", "Ireland", "AgriTech"),
    ("Catalyst Bio", "Priya Subramanian", "Singapore", "Pharma"),
    ("Obsidian Cyber", "Ethan Brooks", "United States", "Security Ops"),
    ("Lumen Photonics", "Yuki Tanaka", "Japan", "Hardware SaaS"),
    ("Crestline Insurance", "Natalie Price", "United Kingdom", "InsurTech"),
    ("Foundry DevOps", "Lucas Fernandez", "Spain", "DevOps"),
    ("Riverbend Banking", "Christopher Reed", "United States", "Core Banking"),
    ("Zephyr Drones", "Antoine Moreau", "France", "Aerospace"),
    ("Saffron Hospitality", "Leila Haddad", "UAE", "Hospitality"),
    ("Echo Voice AI", "Ryan Cho", "United States", "Conversational AI"),
    ("Juniper Wellness", "Megan Foster", "Canada", "Consumer Health"),
    ("Monolith DB", "Tomasz Nowak", "Poland", "Databases"),
    ("Clearwater Risk", "Rebecca Hayes", "United Kingdom", "Compliance"),
    ("Tidal Oceanics", "Mikkel Jensen", "Denmark", "Climate Tech"),
    ("Sparkline Ads", "Jessica Rivera", "United States", "AdTech"),
    ("Kinetics Sports", "Liam Walsh", "Australia", "Sports Analytics"),
    ("Valence Materials", "katrin Becker", "Germany", "Materials Science"),
    ("Orbit Satellites", "Victor Alvarez", "United States", "SpaceTech"),
    ("Canopy Climate", "Freya Holm", "Norway", "Carbon Accounting"),
    ("PulsePoint Care", "Dr. Samuel Osei", "United Kingdom", "Telehealth"),
    ("Arcadia Studios", "Tessa Van Dijk", "Netherlands", "3D Graphics"),
    ("Bridgewater Freight", "Owen Campbell", "Canada", "Freight Tech"),
    ("NovaGrid Utilities", "Isabella Romano", "Italy", "Smart Grid"),
    ("SignalFlow IoT", "Arjun Mehta", "India", "Industrial IoT"),
    ("Chronos Scheduling", "Maya Hoffman", "United States", "Productivity"),
    ("Vector Robotics", "Hana Kobayashi", "Japan", "Robotics"),
    ("BluePeak Analytics", "Caleb Wright", "United States", "Revenue Ops"),
    ("TerraForm Agri", "Sofia Lindholm", "Sweden", "Precision Ag"),
    ("Vantage Procurement", "Noah Goldberg", "United States", "Procurement SaaS"),
]


def seed_database(db: Session) -> None:
    """Idempotently populate realistic MetricPulse demo data on first startup."""
    now = datetime.now(timezone.utc)
    today = date.today()

    # 1. Workspace
    if db.query(Workspace).count() == 0:
        workspace = Workspace(
            name="MetricPulse Labs",
            slug="metricpulse-labs",
            billing_email="billing@metricpulse.io",
            currency="USD",
            plan_tier="Enterprise",
            nrr_target=118.0,
            timezone="America/Los_Angeles",
            updated_at=now,
        )
        db.add(workspace)

    # 2. Users (Demo Admin, Demo Viewer + realistic team)
    if db.query(User).count() == 0:
        default_pw_hash = hash_password(DEMO_PASSWORD)
        team_seed = [
            ("Elena Vance", DEMO_ADMIN_EMAIL, "Admin", "VP of Revenue Operations", "Executive", "Active", "#6366f1", 5),
            ("Marcus Chen", DEMO_VIEWER_EMAIL, "Viewer", "Senior Product Analyst", "Analytics", "Active", "#10b981", 12),
            ("Sofia Morales", "sofia.morales@metricpulse.io", "Admin", "Head of Engineering", "Engineering", "Active", "#8b5cf6", 28),
            ("Priya Nair", "priya.nair@metricpulse.io", "Editor", "Growth Marketing Lead", "Growth", "Active", "#f59e0b", 45),
            ("Liam O'Connor", "liam.oconnor@metricpulse.io", "Editor", "Customer Success Manager", "Customer Success", "Active", "#0ea5e9", 95),
            ("Noah Takahashi", "noah.takahashi@metricpulse.io", "Viewer", "FP&A Associate", "Finance", "Active", "#ec4899", 180),
            ("Hannah Brooks", "hannah.brooks@metricpulse.io", "Editor", "Solutions Architect", "Sales", "Active", "#14b8a6", 310),
            ("Devon Patel", "devon.patel@metricpulse.io", "Viewer", "BI Contractor", "Analytics", "Invited", "#64748b", 1440),
        ]
        for idx, (name, email, role, title, dept, status_val, color, mins_ago) in enumerate(team_seed):
            db.add(
                User(
                    full_name=name,
                    email=email,
                    password_hash=default_pw_hash,
                    role=role,
                    title=title,
                    department=dept,
                    status=status_val,
                    avatar_color=color,
                    last_active_at=now - timedelta(minutes=mins_ago),
                    created_at=now - timedelta(days=340 - idx * 32),
                )
            )

    # 3. Daily Metrics (365 days of realistic SaaS growth)
    if db.query(DailyMetric).count() == 0:
        rng = random.Random(42)
        total_days = 365
        base_mrr = 84_200.0
        base_users = 4_180
        metrics_to_add: list[DailyMetric] = []

        for i in range(total_days):
            day = today - timedelta(days=total_days - 1 - i)
            progress = i / (total_days - 1)  # 0.0 -> 1.0

            # Smooth compounding growth + gentle seasonality + realistic micro-variance
            growth_curve = 1.0 + 0.78 * (progress ** 1.12)
            seasonality = 1.0 + 0.025 * math.sin(2 * math.pi * i / 90.0)
            weekday_factor = 1.04 if day.weekday() < 5 else 0.91

            mrr = round(base_mrr * growth_curve * seasonality + rng.uniform(-900, 1100), 2)
            daily_revenue = round((mrr / 30.0) * weekday_factor * rng.uniform(0.95, 1.09), 2)
            # Operating expenses improve as a % of revenue as SaaS scales (64% -> 53%)
            expense_ratio = 0.64 - 0.11 * progress + rng.uniform(-0.025, 0.025)
            daily_expenses = round(daily_revenue * expense_ratio, 2)

            active_users = int(base_users * (1.0 + 1.02 * (progress ** 1.08)) + rng.randint(-55, 75))
            new_users = int((28 + 34 * progress) * weekday_factor + rng.randint(-6, 9))
            churned_users = max(2, int((9 + 3 * (1 - progress)) + rng.randint(-2, 3)))

            # Churn rate trends down from ~3.4% to ~2.05%
            churn_rate = round(max(1.5, 3.45 - 1.38 * progress + rng.uniform(-0.09, 0.09)), 2)
            # NRR trends up from ~111.5% to ~119.2%
            nrr = round(111.4 + 7.8 * progress + rng.uniform(-0.45, 0.45), 2)

            metrics_to_add.append(
                DailyMetric(
                    metric_date=day,
                    mrr=mrr,
                    revenue=daily_revenue,
                    expenses=daily_expenses,
                    active_users=active_users,
                    new_users=new_users,
                    churned_users=churned_users,
                    churn_rate=churn_rate,
                    nrr=nrr,
                )
            )
        db.add_all(metrics_to_add)

    # 4. Acquisition Channels
    if db.query(AcquisitionChannel).count() == 0:
        channels = [
            ("Organic Search", 2890, 34.2, 4.8, 142.0, "#6366f1"),
            ("Product-Led Viral", 2045, 24.2, 6.4, 68.0, "#10b981"),
            ("Paid Search", 1520, 18.0, 3.5, 385.0, "#0ea5e9"),
            ("Partner Ecosystem", 1015, 12.0, 5.2, 210.0, "#8b5cf6"),
            ("Outbound Sales", 640, 7.6, 7.9, 620.0, "#f59e0b"),
            ("Community & Docs", 340, 4.0, 5.6, 95.0, "#ec4899"),
        ]
        for name, users, pct, conv, cac, color in channels:
            db.add(
                AcquisitionChannel(
                    channel=name,
                    users=users,
                    percentage=pct,
                    conversion_rate=conv,
                    cac=cac,
                    color=color,
                )
            )

    # 5. Customers (64 realistic B2B SaaS accounts)
    if db.query(Customer).count() == 0:
        rng = random.Random(108)
        plan_weights = [("Starter", 0.36), ("Pro", 0.42), ("Enterprise", 0.22)]
        status_weights = [("Active", 0.70), ("Trial", 0.17), ("Churned", 0.13)]

        def weighted_choice(options: list[tuple[str, float]]) -> str:
            r = rng.random()
            acc = 0.0
            for label, weight in options:
                acc += weight
                if r <= acc:
                    return label
            return options[-1][0]

        customers_to_add: list[Customer] = []
        for idx, (company, contact, country, industry) in enumerate(SEED_COMPANIES):
            contact_clean = contact.title()
            plan = weighted_choice(plan_weights)
            status_val = weighted_choice(status_weights)

            if plan == "Starter":
                mrr = float(rng.choice([299, 399, 499, 599, 799]))
                seats = rng.randint(4, 18)
            elif plan == "Pro":
                mrr = float(rng.choice([1250, 1600, 1950, 2400, 2900, 3450]))
                seats = rng.randint(20, 85)
            else:
                mrr = float(rng.choice([5500, 6800, 8200, 9600, 12400, 15800]))
                seats = rng.randint(90, 420)

            if status_val == "Trial":
                mrr = 0.0
                health = rng.randint(68, 92)
                created_days_ago = rng.randint(2, 26)
                payment_days_ago = created_days_ago
            elif status_val == "Churned":
                health = rng.randint(12, 38)
                created_days_ago = rng.randint(95, 355)
                payment_days_ago = rng.randint(35, 85)
            else:
                health = rng.randint(72, 99)
                created_days_ago = rng.randint(20, 360)
                payment_days_ago = rng.randint(1, 29)

            domain_slug = (
                company.lower()
                .replace(" ", "")
                .replace(".", "")
                .replace("'", "")
            )
            first_token = contact_clean.split()[0].lower().replace(".", "")
            email = f"{first_token}@{domain_slug}.io"

            customers_to_add.append(
                Customer(
                    company_name=company,
                    contact_name=contact_clean,
                    contact_email=email,
                    plan=plan,
                    status=status_val,
                    mrr=mrr,
                    seats=seats,
                    country=country,
                    industry=industry,
                    health_score=health,
                    last_payment_date=today - timedelta(days=payment_days_ago),
                    created_at=today - timedelta(days=created_days_ago),
                )
            )
        db.add_all(customers_to_add)

    db.commit()
