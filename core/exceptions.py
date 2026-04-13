from rest_framework.views import exception_handler
from rest_framework.response import Response
from services.odoo_client import OdooBusinessError, OdooConnectionError
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, OdooBusinessError):
        logger.warning(f"Odoo Business Error: {exc}")
        return Response({"error": "Odoo Business Error", "detail": str(exc)}, status=400)

    if isinstance(exc, OdooConnectionError):
        logger.error(f"Odoo Connection Error: {exc}")
        return Response({"error": "Odoo Connection Error", "detail": str(exc)}, status=503)

    return response
