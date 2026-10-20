# MSME360 — Integrated Business Management & Analytics Platform

MSME360 is an integrated, multi-tenant operations, inventory, and financial intelligence web platform built for Micro, Small, and Medium Enterprises (MSMEs). It consolidates inventory control, procurement, POS billing, customer CRM, financial ledger reporting, workforce administration, and deterministic business intelligence into a unified, secure system.

---

## 🌟 Key Functional Modules

1. **Dashboard & KPIs**: Role-tailored metrics, 30-day cash flow & sales charts, top-moving products, inventory valuation, and pending receivables.
2. **Product Catalog & Inventory**: Categories, multi-attribute products, live stock tracking, stock level status badges (Normal, Low, Out of Stock), stock movement ledger, manual adjustments with audit reason codes.
3. **Purchases & GRN (Goods Received Notes)**: Supplier management, multi-item purchase orders, draft/confirmed/received lifecycle, automated inventory incrementing upon GRN receipt.
4. **Point-of-Sale (POS) & Invoicing**: Barcode scanning/search, responsive cart with quantity stepper, guest vs. registered customer checkout, discount & tax calculations, printable thermal/A4 invoice modal, automatic stock deduction and financial income posting.
5. **Customer Relationship Management (CRM)**: Customer directory, lifetime spend tracking, order history drawer, customer registration & profile updates.
6. **Double-Entry Financial Ledger**: Non-overlapping debtor aging analysis (0-30, 31-60, 61-90, 91+ days), authoritative revenue and expense ledger, cash flow summaries, manual expense logging with receipt reference.
7. **Workforce Administration**: Employee directory, department & role tracking, date of joining, salary management with PII data masking for Manager roles, employee deactivation.
8. **Deterministic Analytics & Business Intelligence**:
   - **Dynamic Reorder Point (ROP)**: Formula based on rolling 30-day daily usage rate, supplier lead time, and safety stock.
   - **Velocity Classification**: Fast ($\ge 20$ units/30d), Medium (5-19 units), Slow ($< 5$ units), Dead stock detection.
   - **Live Stock Alerts**: Low stock and out-of-stock notification bell with actionable reorder triggers.
9. **Audited Reports & Export**: Filtered sales reports by date range and category, RFC 4180-compliant CSV streaming exports, structured JSON exports.
10. **Role-Based Access Control (RBAC)**: Centralized enforcement across 4 tiers: `ADMIN`, `OWNER`, `MANAGER`, and `STAFF`.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**:
  - React 18, Vite, React Router DOM v6
  - Custom CSS Design System with native CSS variables and glassmorphism styling
  - Lucide React icons
  - Recharts for business visualization
  - Centralized Axios client (`client/src/api/client.js`) with automatic JWT bearer token injection and standard error handling
- **Backend**:
  - Python 3.12+, FastAPI framework
  - SQLAlchemy 2.0 ORM with 3NF normalized relational schema
  - Pydantic v2 schemas for strict request/response validation
  - Alembic for database migrations
  - Uvicorn ASGI server
  - Pytest & Pytest-Cov (84% test coverage across services)
- **Database**:
  - PostgreSQL 15+ target relational database (with SQLite fallback for rapid local developer setup)
  - Full multi-tenancy isolation (`tenant_id` on all operational tables)
  - Foreign keys, composite indexes, unique constraints, and atomic transactions
- **Authentication & Security**:
  - OAuth2 Bearer-style JWT (HS256, 24-hour expiration)
  - Passwords hashed with bcrypt (cost factor $\ge 12$)
  - PII masking on sensitive fields (e.g., employee salaries for Manager roles)

---

## 👥 Seeded Demo Credentials

| Role | Username | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `Admin@12345` | System configuration, user provisioning, all operational & financial modules |
| **OWNER** | `owner` | `Owner@12345` | Full business operations, finance, analytics, user provisioning |
| **MANAGER** | `manager` | `Manager@12345` | Catalog, inventory, purchases, sales, masked employee roster (Finance blocked) |
| **STAFF** | `staff` | `Staff@12345` | POS sales, customer directory, stock alert viewing (Admin & Finance blocked) |

> *Quick Login*: The login screen includes one-click role chips to automatically populate these credentials for demo testing.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ (with npm)
- Optional: PostgreSQL 15+ or Docker

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (creates tables)
alembic upgrade head

# Seed initial tenant, users, products, suppliers, customers, and ledger
python scripts/seed.py

# Start FastAPI ASGI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation is immediately available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 2. Frontend Setup

```bash
# In a separate terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Access the application at `http://localhost:5173`. Vite automatically proxies API requests to `http://localhost:8000`.

### 3. Running with Docker Compose

For a complete containerized environment including PostgreSQL:
```bash
docker compose up --build
```

---

## 🧪 Running Automated Tests

MSME360 includes comprehensive unit and integration tests verifying RBAC, catalog, inventory ledger, purchases, sales, finance, analytics, reports, and HR services:

```bash
# Run pytest with code coverage
backend/venv/Scripts/python.exe -m pytest backend/tests --cov=backend/app --cov-report=term-missing
```

**Results**: 25/25 passing tests, **84%** line coverage across backend services and business logic.

---

## 🛡️ License & Compliance
This software is built for educational, assessment, and business operational management under MSME compliance frameworks. No proprietary or sensitive production credentials are stored in this repository.
