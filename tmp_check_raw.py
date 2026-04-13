import json
from services.odoo_client import odoo_call
from datetime import datetime

payload = {
    "res_model": "project.task",
    "res_id": 103,
    "activity_type_id": 1,
    "summary": "Raw check",
    "user_id": 26
}

try:
    res = odoo_call("mail.activity", "create", [payload])
    print("Success:", res)
except Exception as e:
    print("Error:", e)
