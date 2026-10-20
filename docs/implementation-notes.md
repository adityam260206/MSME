# MSME360 Implementation Notes & Architecture Specification

## 1. System Overview
MSME360 is an integrated, multi-tenant web-based operations and financial intelligence platform designed specifically for Micro, Small, and Medium Enterprises (MSMEs). It consolidates catalog management, inventory ledger tracking, supplier procurement, point-of-sale (POS) billing, CRM, double-entry financial reporting, employee management, and business analytics.

## 2. Technology Stack
- **Frontend**: React 18, Vite, React Router 6, Tailwind CSS custom design tokens, Axios API client with automatic bearer authorization, Recharts for analytics, Lucide React icons.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2 schemas, Alembic database migrations, Uvicorn ASGI server.
- **Database**: PostgreSQL 15+ relational database (with automated SQLite fallback for local developer ergonomics & test suites), normalized to Third Normal Form (3NF).
- **Security & RBAC**: OAuth2 Bearer JWT (HS256, 24-hour expiration), bcrypt password hashing (cost factor 12), strict multi-tenancy enforced at every query level via `tenant_id`.

## 3. Ambiguity & Gap Resolutions (Section 14 Compliance)

### 3.1 Double-Counting Prevention in Sales & Purchases vs. Ledger
- **Resolution**: The `financial_transactions` table acts as the authoritative financial ledger. When a Sale transitions to `COMPLETED`, a single atomic `INCOME` record is posted to `financial_transactions` with `category='SALES'`. When a Purchase transitions to `RECEIVED`, an `EXPENSE` record is posted with `category='PURCHASES'`. Invoices and Purchases represent transactional proof and line-item details, but revenue/expense calculations query the authoritative financial ledger. This completely prevents double-counting across the dashboard and financial statements.

### 3.2 Debtor Aging Buckets
- **Resolution**: Receivables aging strictly partitions unpaid sales into non-overlapping standard accounting intervals:
  - `0 - 30 days`: Current / regular credit cycle.
  - `31 - 60 days`: Moderately overdue.
  - `61 - 90 days`: High risk.
  - `91+ days`: Delinquent / bad debt risk.
- Calculated dynamically relative to `CURRENT_DATE - sale.created_at`.

### 3.3 Dynamic Reorder Point (ROP) & Safety Stock Formula
- **Resolution**: Deterministic formula evaluated across rolling 30-day movement history:
  $$\text{Daily Usage Rate} = \frac{\sum \text{Quantity Sold in Past 30 Days}}{30}$$
  $$\text{ROP} = (\text{Daily Usage Rate} \times \text{Supplier Lead Time in Days}) + \text{Safety Stock}$$
- Default supplier lead time is 7 days if not configured on the product; minimum safety stock is 5 units.

### 3.4 Inventory Turnover & Velocity Bands
- **Resolution**:
  - `FAST`: Sold $\ge 20$ units in the past 30 days.
  - `MEDIUM`: Sold between 5 and 19 units in the past 30 days.
  - `SLOW`: Sold $< 5$ units in the past 30 days.
  - `DEAD`: 0 units sold in $\ge 60$ days with positive stock on hand.

### 3.5 Role-Based Access Control (RBAC) Matrix
| Module / Capability | ADMIN | OWNER | MANAGER | STAFF |
| :--- | :---: | :---: | :---: | :---: |
| Tenant Settings & User Provisioning | ✅ | ✅ | ❌ | ❌ |
| Financial Ledger & Net Profit | ✅ | ✅ | ❌ | ❌ |
| Employee Salary Fields (PII) | ✅ | ✅ | 🔒 (Masked) | ❌ |
| Catalog Creation & Editing | ✅ | ✅ | ✅ | ❌ |
| Stock Adjustment & Movements | ✅ | ✅ | ✅ | ❌ |
| Purchase Orders & GRN Logging | ✅ | ✅ | ✅ | ❌ |
| POS Sales & Invoicing | ✅ | ✅ | ✅ | ✅ |
| Customer Directory & Add Customer | ✅ | ✅ | ✅ | ✅ |
| Standard Stock Alerts View | ✅ | ✅ | ✅ | ✅ |

## 4. Multi-Tenancy Architecture
Every database table (except global system metadata) contains an indexed `tenant_id` column. All database queries through services filter on `tenant_id == current_user.tenant_id`. Cross-tenant data leakage is structurally impossible.
