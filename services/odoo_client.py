import xmlrpc.client
from django.conf import settings

_uid = None
_models = None


class OdooConnectionError(Exception):
    pass


class OdooBusinessError(Exception):
    pass


def _get_connection():
    global _uid, _models
    if _uid is None:
        common = xmlrpc.client.ServerProxy(f"{settings.ODOO_URL}/xmlrpc/2/common")
        _uid = common.authenticate(
            settings.ODOO_DB, settings.ODOO_USER, settings.ODOO_API_KEY, {}
        )
        if _uid is False:
            raise OdooConnectionError(
                "Authentication failed: invalid db, user, or api key"
            )
        _models = xmlrpc.client.ServerProxy(f"{settings.ODOO_URL}/xmlrpc/2/object")
    return _uid, _models


def odoo_call(model, method, args, kwargs=None):
    global _uid, _models
    uid, models = _get_connection()
    try:
        return models.execute_kw(
            settings.ODOO_DB,
            uid,
            settings.ODOO_API_KEY,
            model,
            method,
            args,
            kwargs or {},
        )
    except xmlrpc.client.Fault as e:
        raise OdooBusinessError(e.faultString) from e
    except Exception as e:
        # If connection died or idle, reset global state and retry once.
        _uid = None
        _models = None
        try:
            uid, models = _get_connection()
            return models.execute_kw(
                settings.ODOO_DB,
                uid,
                settings.ODOO_API_KEY,
                model,
                method,
                args,
                kwargs or {},
            )
        except Exception as retry_e:
            raise OdooConnectionError(str(retry_e)) from retry_e
