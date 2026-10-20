from typing import Any, Optional
from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str,
        details: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "success": False,
                "message": message,
                "error_code": error_code,
                "details": details,
            },
        )
        self.message = message
        self.error_code = error_code
        self.details = details

class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Invalid username or password"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="INVALID_CREDENTIALS",
        )

class ForbiddenException(AppException):
    def __init__(self, message: str = "Access denied for current role"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code="FORBIDDEN",
        )

class InsufficientStockException(AppException):
    def __init__(self, message: str = "Insufficient stock for requested item", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code="INSUFFICIENT_STOCK",
            details=details,
        )

class DuplicateSKUException(AppException):
    def __init__(self, message: str = "A product with this SKU already exists"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code="DUPLICATE_SKU",
        )

class EmptyItemsException(AppException):
    def __init__(self, message: str = "At least one item is required"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code="EMPTY_ITEMS",
        )

class AlreadyCancelledException(AppException):
    def __init__(self, message: str = "Order is already cancelled"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code="ALREADY_CANCELLED",
        )

class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            error_code="NOT_FOUND",
        )
