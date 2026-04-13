import xmlrpc.client
from django.conf import settings
from .odoo_client import odoo_call

def authenticate_with_odoo(login, password):
    try:
        common = xmlrpc.client.ServerProxy(f"{settings.ODOO_URL}/xmlrpc/2/common")
        user_uid = common.authenticate(settings.ODOO_DB, login, password, {})
        if not user_uid:
            return None
    except Exception:
        return None

    user_record = odoo_call("res.users", "read", [[user_uid]], {"fields": [
        "name", "login", "email", "partner_id", "employee_id", "group_ids"
    ]})

    if not user_record:
        return None
    
    user_data = user_record[0]

    group_system_id = None
    group_manager_id = None
    try:
        group_system = odoo_call("ir.model.data", "search_read", 
            [[["module", "=", "base"], ["name", "=", "group_system"]]], 
            {"fields": ["res_id"], "limit": 1})
        if group_system: group_system_id = group_system[0]["res_id"]

        group_manager = odoo_call("ir.model.data", "search_read", 
            [[["module", "=", "project"], ["name", "=", "group_project_manager"]]], 
            {"fields": ["res_id"], "limit": 1})
        if group_manager: group_manager_id = group_manager[0]["res_id"]
    except Exception:
        pass

    groups = user_data.get("group_ids", [])
    if group_system_id and group_system_id in groups:
        role = "superuser"
    elif group_manager_id and group_manager_id in groups:
        role = "manager"
    else:
        role = "employee"
        
    employee_id_val = user_data.get("employee_id")
    emp_data = {}
    if employee_id_val:
        emp_id = employee_id_val[0] if isinstance(employee_id_val, list) else employee_id_val
        emp_records = odoo_call("hr.employee", "read", [[emp_id]], {"fields": [
            "parent_id", "child_ids", "department_id"
        ]})
        if emp_records:
            emp_data = emp_records[0]

    def get_id(field_val):
        if field_val:
            return field_val[0] if isinstance(field_val, list) else field_val
        return None

    return {
        "odoo_uid": user_uid,
        "name": user_data.get("name"),
        "login": user_data.get("login"),
        "email": user_data.get("email"),
        "role": role,
        "partner_id": get_id(user_data.get("partner_id")),
        "employee_id": emp_data.get("id"),
        "parent_id": get_id(emp_data.get("parent_id")),
        "child_ids": emp_data.get("child_ids", []),
        "department_id": get_id(emp_data.get("department_id")),
    }
