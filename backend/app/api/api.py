from fastapi import APIRouter
from backend.app.api.routers import (
    auth, users, catalog, inventory, suppliers,
    purchases, customers, sales, finance, employees,
    dashboard, analytics, alerts, reports, ai,
    credit_risk, schemes, customer_ratings, customer_portal
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(catalog.router)
api_router.include_router(inventory.router)
api_router.include_router(suppliers.router)
api_router.include_router(purchases.router)
api_router.include_router(customers.router)
api_router.include_router(sales.router)
api_router.include_router(finance.router)
api_router.include_router(employees.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
api_router.include_router(ai.router)
api_router.include_router(credit_risk.router)
api_router.include_router(schemes.router)
api_router.include_router(customer_ratings.router)
api_router.include_router(customer_portal.router)
