import sys
import os
from decimal import Decimal
from datetime import datetime, timezone, timedelta

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.security import hash_password
from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.models import (
    Tenant, Role, User, Category, Product, Supplier,
    Customer, Purchase, PurchaseItem, Sale, SaleItem,
    StockMovement, FinancialTransaction, Employee, Alert,
    BusinessGoal
)

DEMO_TENANT_ID = "demo-tenant-msme360-001"

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Roles
        roles_data = [
            ("ADMIN", "System Administrator with full diagnostic and provisioning rights"),
            ("OWNER", "Business Owner with full business operations and financial access"),
            ("MANAGER", "Store Manager with operational catalog, inventory, and sales control"),
            ("STAFF", "Sales Staff with POS counter and customer registration access"),
        ]
        for role_name, desc in roles_data:
            existing = db.query(Role).filter(Role.name == role_name).first()
            if not existing:
                db.add(Role(name=role_name, description=desc))
        db.commit()

        # 2. Seed Tenant
        tenant = db.query(Tenant).filter(Tenant.id == DEMO_TENANT_ID).first()
        if not tenant:
            tenant = Tenant(
                id=DEMO_TENANT_ID,
                name="Bharat Enterprises & Trading Co. (Demo)",
                currency="INR",
                is_active=True,
            )
            db.add(tenant)
            db.commit()
            print(f"Created Tenant: {tenant.name}")

        # 3. Seed Users
        users_data = [
            ("admin", "admin@msme360.local", "Admin@12345", "Super Admin", "ADMIN"),
            ("owner", "owner@msme360.local", "Owner@12345", "Sunil Verma (Owner)", "OWNER"),
            ("manager", "manager@msme360.local", "Manager@12345", "Ramesh Joshi (Store Manager)", "MANAGER"),
            ("staff", "staff@msme360.local", "Staff@12345", "Pooja Patel (Sales Staff)", "STAFF"),
            ("counterstaff", "counterstaff@msme360.local", "Staff@12345", "Counter Staff", "STAFF"),
        ]
        user_objects = {}
        for username, email, pwd, fname, role in users_data:
            u = db.query(User).filter(User.username == username).first()
            if not u:
                u = User(
                    tenant_id=DEMO_TENANT_ID,
                    username=username,
                    email=email,
                    password_hash=hash_password(pwd),
                    full_name=fname,
                    role=role,
                    is_active=True,
                )
                db.add(u)
                db.commit()
                db.refresh(u)
                print(f"Created User: {username} ({role})")
            else:
                # Ensure existing user has valid password hash and is active
                from backend.app.core.security import verify_password
                if not verify_password(pwd, u.password_hash) or not u.is_active:
                    u.password_hash = hash_password(pwd)
                    u.is_active = True
                    db.commit()
            user_objects[username] = u

        admin_user = user_objects["admin"]

        # 4. Seed Categories
        categories_data = [
            ("Electronics & Hardware", "POS hardware, barcode scanners, and electronics"),
            ("Industrial Fasteners", "Bolts, bearings, fasteners, and workshop items"),
            ("Packaging Materials", "Corrugated boxes, bubble rolls, and tapes"),
            ("Office Supplies", "Printing rolls, tags, and documentation stationery"),
        ]
        category_objects = {}
        for name, desc in categories_data:
            c = db.query(Category).filter(
                Category.tenant_id == DEMO_TENANT_ID,
                Category.name == name
            ).first()
            if not c:
                c = Category(
                    tenant_id=DEMO_TENANT_ID,
                    name=name,
                    description=desc,
                )
                db.add(c)
                db.commit()
                db.refresh(c)
                print(f"Created Category: {name}")
            category_objects[name] = c

        # 5. Seed Products
        products_data = [
            (
                "Wireless POS Barcode Scanner", "ELEC-WBS-001", "Electronics & Hardware",
                Decimal("1200.00"), Decimal("1850.00"), 40, 5, 7, 10
            ),
            (
                "Thermal Receipt Printer 80mm", "ELEC-TRP-002", "Electronics & Hardware",
                Decimal("2600.00"), Decimal("3900.00"), 15, 5, 10, 5
            ),
            (
                "High-Speed Ball Bearings 6204", "HARD-BB-003", "Industrial Fasteners",
                Decimal("180.00"), Decimal("320.00"), 3, 8, 14, 10  # LOW STOCK
            ),
            (
                "Hex Head High-Tensile Bolts (Box 100)", "HARD-HB-004", "Industrial Fasteners",
                Decimal("450.00"), Decimal("750.00"), 0, 10, 7, 15  # OUT OF STOCK
            ),
            (
                "Corrugated Shipping Boxes (Pack 50)", "PKG-BOX-005", "Packaging Materials",
                Decimal("600.00"), Decimal("950.00"), 65, 20, 5, 20
            ),
            (
                "Thermal Paper Rolls 3-inch (Box 24)", "OFF-TPR-006", "Office Supplies",
                Decimal("320.00"), Decimal("540.00"), 50, 15, 4, 15
            ),
        ]
        product_objects = {}
        for name, sku, cat_name, cost, sell, stock, min_s, lead, safe in products_data:
            p = db.query(Product).filter(Product.sku == sku).first()
            if not p:
                p = Product(
                    tenant_id=DEMO_TENANT_ID,
                    category_id=category_objects[cat_name].id,
                    name=name,
                    sku=sku,
                    cost_price=cost,
                    selling_price=sell,
                    stock_quantity=stock,
                    min_stock_level=min_s,
                    lead_time_days=lead,
                    safety_stock=safe,
                )
                db.add(p)
                db.flush()

                if stock > 0:
                    mov = StockMovement(
                        tenant_id=DEMO_TENANT_ID,
                        product_id=p.id,
                        movement_type="ADJUSTMENT",
                        quantity=stock,
                        previous_stock=0,
                        new_stock=stock,
                        reason="Opening stock balance for demo store",
                        actor_id=admin_user.id,
                        reference_id=f"INIT-{sku}",
                    )
                    db.add(mov)

                db.commit()
                db.refresh(p)
                print(f"Created Product: {name} (Stock: {stock})")
            product_objects[sku] = p

        # 6. Seed Suppliers
        suppliers_data = [
            ("Apex Electronics Distribution Ltd", "Deepak Shah", "deepak@apexdist.com", "+91 98200 11223", "Plot 42, Electronic Zone, Pune"),
            ("National Industrial Fasteners Co", "Manoj Tiwari", "sales@nationalfasteners.in", "+91 98331 44556", "Industrial Area Phase II, Ahmedabad"),
        ]
        supplier_objects = {}
        for name, contact, email, phone, addr in suppliers_data:
            s = db.query(Supplier).filter(Supplier.tenant_id == DEMO_TENANT_ID, Supplier.name == name).first()
            if not s:
                s = Supplier(
                    tenant_id=DEMO_TENANT_ID,
                    name=name,
                    contact_name=contact,
                    email=email,
                    phone=phone,
                    address=addr,
                )
                db.add(s)
                db.commit()
                db.refresh(s)
                print(f"Created Supplier: {name}")
            supplier_objects[name] = s

        # 7. Seed Customers
        customers_data = [
            ("Rajesh Kumar (Tech Enterprises)", "rajesh@techenterprises.in", "+91 98112 33445"),
            ("Anita Sharma (Apex Logistics)", "anita@apexlogistics.com", "+91 98223 55667"),
            ("Kiran Patel (Patel Workshop)", "kiran@patelworkshop.com", "+91 98445 66778"),
        ]
        customer_objects = {}
        for name, email, phone in customers_data:
            c = db.query(Customer).filter(Customer.tenant_id == DEMO_TENANT_ID, Customer.name == name).first()
            if not c:
                c = Customer(
                    tenant_id=DEMO_TENANT_ID,
                    name=name,
                    email=email,
                    phone=phone,
                    total_spent=Decimal("0.00"),
                )
                db.add(c)
                db.commit()
                db.refresh(c)
                print(f"Created Customer: {name}")
            customer_objects[name] = c

        # 8. Seed Completed Purchase Order
        existing_purch = db.query(Purchase).filter(Purchase.tenant_id == DEMO_TENANT_ID).first()
        if not existing_purch:
            p_scanner = product_objects["ELEC-WBS-001"]
            sup = supplier_objects["Apex Electronics Distribution Ltd"]
            purch_sub = Decimal("12000.00")
            purch_tax = Decimal("600.00")
            purch_tot = Decimal("12600.00")

            po = Purchase(
                tenant_id=DEMO_TENANT_ID,
                supplier_id=sup.id,
                purchase_number="PO-20261015-DEMO01",
                status="COMPLETED",
                subtotal=purch_sub,
                tax_rate=Decimal("5.00"),
                tax_amount=purch_tax,
                discount_amount=Decimal("0.00"),
                total_amount=purch_tot,
                payment_method="BANK_TRANSFER",
                payment_status="PAID",
                reference_grn="GRN-20261015-DEMO01",
                actor_id=admin_user.id,
            )
            db.add(po)
            db.flush()

            po_item = PurchaseItem(
                purchase_id=po.id,
                product_id=p_scanner.id,
                product_name=p_scanner.name,
                quantity=10,
                unit_cost=Decimal("1200.00"),
                line_total=Decimal("12000.00"),
            )
            db.add(po_item)

            ft_po = FinancialTransaction(
                tenant_id=DEMO_TENANT_ID,
                type="EXPENSE",
                category="PURCHASES",
                amount=purch_tot,
                reference_id=po.id,
                description=f"Purchase Order PO-20261015-DEMO01 - {sup.name}",
                actor_id=admin_user.id,
            )
            db.add(ft_po)
            db.commit()
            print("Created initial Purchase and Expense entry")

        # 9. Seed Completed Sale Orders
        existing_sales = db.query(Sale).filter(Sale.tenant_id == DEMO_TENANT_ID).first()
        if not existing_sales:
            c_rajesh = customer_objects["Rajesh Kumar (Tech Enterprises)"]
            p_scanner = product_objects["ELEC-WBS-001"]
            p_rolls = product_objects["OFF-TPR-006"]

            sale_sub = Decimal("4240.00")
            sale_tax = Decimal("212.00")
            sale_tot = Decimal("4452.00")

            sale1 = Sale(
                tenant_id=DEMO_TENANT_ID,
                customer_id=c_rajesh.id,
                customer_name=c_rajesh.name,
                invoice_number="INV-20261018-DEMO01",
                status="COMPLETED",
                subtotal=sale_sub,
                tax_rate=Decimal("5.00"),
                tax_amount=sale_tax,
                discount_amount=Decimal("0.00"),
                total_amount=sale_tot,
                payment_method="UPI",
                payment_status="PAID",
                actor_id=user_objects["staff"].id,
            )
            db.add(sale1)
            db.flush()

            item1 = SaleItem(
                sale_id=sale1.id,
                product_id=p_scanner.id,
                product_name=p_scanner.name,
                sku=p_scanner.sku,
                quantity=2,
                unit_price=Decimal("1850.00"),
                line_total=Decimal("3700.00"),
            )
            item2 = SaleItem(
                sale_id=sale1.id,
                product_id=p_rolls.id,
                product_name=p_rolls.name,
                sku=p_rolls.sku,
                quantity=1,
                unit_price=Decimal("540.00"),
                line_total=Decimal("540.00"),
            )
            db.add_all([item1, item2])

            c_rajesh.total_spent = Decimal("4452.00")

            ft_sale = FinancialTransaction(
                tenant_id=DEMO_TENANT_ID,
                type="INCOME",
                category="SALES",
                amount=sale_tot,
                reference_id=sale1.id,
                description=f"Sale Invoice INV-20261018-DEMO01 - {c_rajesh.name}",
                actor_id=user_objects["staff"].id,
            )
            db.add(ft_sale)
            db.commit()
            print("Created initial Sale and Income entry")

        # 10. Seed Manual Overhead Expense
        existing_overhead = db.query(FinancialTransaction).filter(
            FinancialTransaction.tenant_id == DEMO_TENANT_ID,
            FinancialTransaction.category == "UTILITIES"
        ).first()
        if not existing_overhead:
            ft_util = FinancialTransaction(
                tenant_id=DEMO_TENANT_ID,
                type="EXPENSE",
                category="UTILITIES",
                amount=Decimal("3500.00"),
                description="Commercial Electricity & Power Bill (Monthly)",
                actor_id=admin_user.id,
            )
            db.add(ft_util)
            db.commit()
            print("Created Utilities Expense entry")

        # 11. Seed Employees
        employees_data = [
            ("Vikram Malhotra", "vikram@msme360.local", "Store Operations Lead", "Operations", Decimal("45000.00")),
            ("Rohan Gupta", "rohan@msme360.local", "Senior Sales Associate", "Sales", Decimal("24000.00")),
            ("Priya Nair", "priya@msme360.local", "Inventory & Warehouse Supervisor", "Logistics", Decimal("32000.00")),
        ]
        for name, email, role, dept, salary in employees_data:
            emp = db.query(Employee).filter(Employee.tenant_id == DEMO_TENANT_ID, Employee.email == email).first()
            if not emp:
                emp = Employee(
                    tenant_id=DEMO_TENANT_ID,
                    name=name,
                    email=email,
                    role=role,
                    department=dept,
                    monthly_base_salary=salary,
                )
                db.add(emp)
                db.commit()
                print(f"Created Employee: {name} ({dept})")

        # 12. Seed Alerts
        p_bb = product_objects["HARD-BB-003"]
        p_hb = product_objects["HARD-HB-004"]

        existing_alerts = db.query(Alert).filter(Alert.tenant_id == DEMO_TENANT_ID).count()
        if existing_alerts == 0:
            a1 = Alert(
                tenant_id=DEMO_TENANT_ID,
                product_id=p_bb.id,
                alert_type="LOW_STOCK",
                severity="WARNING",
                title=f"Low Stock: {p_bb.name}",
                message=f"Product '{p_bb.name}' stock is {p_bb.stock_quantity} (threshold: {p_bb.min_stock_level}).",
            )
            a2 = Alert(
                tenant_id=DEMO_TENANT_ID,
                product_id=p_hb.id,
                alert_type="OUT_OF_STOCK",
                severity="CRITICAL",
                title=f"Out of Stock: {p_hb.name}",
                message=f"Product '{p_hb.name}' is completely out of stock. Immediate reorder needed.",
            )
            db.add_all([a1, a2])
            db.commit()
            print("Created Low Stock and Out of Stock Alerts")

        # 12. Seed Business Goal for current month
        curr_month = datetime.now(timezone.utc).strftime("%Y-%m")
        existing_goal = db.query(BusinessGoal).filter(
            BusinessGoal.tenant_id == DEMO_TENANT_ID,
            BusinessGoal.target_month == curr_month,
        ).first()
        if not existing_goal:
            demo_goal = BusinessGoal(
                tenant_id=DEMO_TENANT_ID,
                target_month=curr_month,
                target_revenue=Decimal("50000.00"),
                target_sales_volume=25,
                notes="Target for current operational month",
            )
            db.add(demo_goal)
            db.commit()
            print(f"Created Business Goal for month {curr_month}: INR 50,000 / 25 sales")

        print("\n=== Demo Seed Completed Successfully! ===")
        print("Demo Credentials:")
        print("  ADMIN:   admin   / Admin@12345")
        print("  OWNER:   owner   / Owner@12345")
        print("  MANAGER: manager / Manager@12345")
        print("  STAFF:   staff   / Staff@12345")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
