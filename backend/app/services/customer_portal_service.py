from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.errors import (
    AppException, InvalidCredentialsException, ForbiddenException, NotFoundException
)
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.tenant import Tenant
from backend.app.models.customer import Customer
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.customer_portal import (
    CustomerRegisterRequest, CustomerLoginRequest, CustomerAuthResponse,
    CustomerProfileResponse, CustomerProfileUpdate
)
from backend.app.schemas.sale import SaleResponse, SaleItemResponse

class CustomerPortalService:
    @staticmethod
    def _get_target_tenant_id(db: Session, requested_tenant_id: Optional[str] = None) -> str:
        if requested_tenant_id:
            t = db.query(Tenant).filter(Tenant.id == requested_tenant_id, Tenant.is_active == True).first()
            if t:
                return t.id
        first_tenant = db.query(Tenant).filter(Tenant.is_active == True).first()
        if not first_tenant:
            raise AppException(500, "No active enterprise tenant configured", "NO_ACTIVE_TENANT")
        return first_tenant.id

    @staticmethod
    def register(db: Session, req: CustomerRegisterRequest) -> CustomerAuthResponse:
        tenant_id = CustomerPortalService._get_target_tenant_id(db, req.tenant_id)
        email_clean = req.email.lower().strip()

        # Check existing customer with same email in tenant
        existing = db.query(Customer).filter(
            Customer.tenant_id == tenant_id,
            Customer.email == email_clean,
        ).first()

        if existing:
            if existing.password_hash:
                raise AppException(
                    400,
                    "An account with this email address already exists. Please log in.",
                    "EMAIL_ALREADY_REGISTERED",
                )
            # Customer was created at checkout without password; activate customer account
            existing.password_hash = hash_password(req.password)
            existing.name = req.name.strip()
            if req.phone:
                existing.phone = req.phone.strip()
            existing.is_active = True
            customer = existing
        else:
            customer = Customer(
                tenant_id=tenant_id,
                name=req.name.strip(),
                email=email_clean,
                phone=req.phone.strip() if req.phone else None,
                password_hash=hash_password(req.password),
                total_spent=Decimal("0.00"),
                is_active=True,
            )
            db.add(customer)

        db.commit()
        db.refresh(customer)

        # Generate JWT access token with role CUSTOMER
        token = create_access_token(
            subject=customer.id,
            role="CUSTOMER",
            tenant_id=customer.tenant_id,
            extra_claims={
                "customer_name": customer.name,
                "email": customer.email,
            },
        )

        audit = AuditLog(
            tenant_id=tenant_id,
            actor_name=customer.name,
            action="CUSTOMER_REGISTRATION",
            entity_type="CUSTOMER",
            entity_id=customer.id,
            details=f"Customer registered on portal: {customer.email}",
        )
        db.add(audit)
        db.commit()

        profile = CustomerProfileResponse(
            id=customer.id,
            tenant_id=customer.tenant_id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            total_spent=customer.total_spent,
            is_active=customer.is_active,
            created_at=customer.created_at.isoformat(),
        )

        return CustomerAuthResponse(
            access_token=token,
            token_type="bearer",
            customer=profile,
        )

    @staticmethod
    def login(db: Session, req: CustomerLoginRequest) -> CustomerAuthResponse:
        email_clean = req.email.lower().strip()
        query = db.query(Customer).filter(Customer.email == email_clean)
        if req.tenant_id:
            query = query.filter(Customer.tenant_id == req.tenant_id)

        customer = query.first()
        if not customer or not customer.password_hash:
            raise InvalidCredentialsException("Invalid customer email or password")

        if not verify_password(req.password, customer.password_hash):
            raise InvalidCredentialsException("Invalid customer email or password")

        if not customer.is_active:
            raise ForbiddenException("Customer account is deactivated")

        token = create_access_token(
            subject=customer.id,
            role="CUSTOMER",
            tenant_id=customer.tenant_id,
            extra_claims={
                "customer_name": customer.name,
                "email": customer.email,
            },
        )

        profile = CustomerProfileResponse(
            id=customer.id,
            tenant_id=customer.tenant_id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            total_spent=customer.total_spent,
            is_active=customer.is_active,
            created_at=customer.created_at.isoformat(),
        )

        return CustomerAuthResponse(
            access_token=token,
            token_type="bearer",
            customer=profile,
        )

    @staticmethod
    def get_orders(
        db: Session,
        customer: Customer,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[SaleResponse], int]:
        """
        STRICT CUSTOMER ISOLATION:
        Customer can ONLY view sales where sale.customer_id == customer.id.
        """
        q = db.query(Sale).filter(
            Sale.customer_id == customer.id,
            Sale.tenant_id == customer.tenant_id,
        )
        total = q.count()
        sales = q.order_by(desc(Sale.created_at)).offset((page - 1) * limit).limit(limit).all()

        results = []
        for s in sales:
            item_res = [SaleItemResponse.model_validate(it) for it in s.items]
            s_res = SaleResponse.model_validate(s)
            s_res.items = item_res
            results.append(s_res)

        return results, total

    @staticmethod
    def get_order_invoice(
        db: Session,
        customer: Customer,
        sale_id: str,
    ) -> SaleResponse:
        """
        STRICT CUSTOMER ISOLATION:
        Customer cannot access another customer's invoice by changing ID.
        """
        sale = db.query(Sale).filter(
            Sale.id == sale_id,
            Sale.customer_id == customer.id,
            Sale.tenant_id == customer.tenant_id,
        ).first()

        if not sale:
            raise NotFoundException("Invoice not found or does not belong to your account")

        res = SaleResponse.model_validate(sale)
        res.items = [SaleItemResponse.model_validate(it) for it in sale.items]
        return res

    @staticmethod
    def update_profile(
        db: Session,
        customer: Customer,
        data: CustomerProfileUpdate,
    ) -> CustomerProfileResponse:
        if data.name and data.name.strip():
            customer.name = data.name.strip()
        if data.phone:
            customer.phone = data.phone.strip()
        if data.email:
            new_email = data.email.lower().strip()
            # Ensure email uniqueness in tenant
            conflict = db.query(Customer).filter(
                Customer.tenant_id == customer.tenant_id,
                Customer.email == new_email,
                Customer.id != customer.id,
            ).first()
            if conflict:
                raise AppException(400, "Email address is already in use by another customer", "DUPLICATE_EMAIL")
            customer.email = new_email

        db.commit()
        db.refresh(customer)

        return CustomerProfileResponse(
            id=customer.id,
            tenant_id=customer.tenant_id,
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            total_spent=customer.total_spent,
            is_active=customer.is_active,
            created_at=customer.created_at.isoformat(),
        )

customer_portal_service = CustomerPortalService()
