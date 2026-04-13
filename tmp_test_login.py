import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import traceback
from services.odoo_auth import authenticate_with_odoo
from services.odoo_client import odoo_call, _get_connection

login = "saikrishna.v@primesoftinc.com"
password = "Krishna12#"

try:
    print("1. Testing base connection...")
    uid, models = _get_connection()
    print("   Connection Success! UID:", uid)
except Exception as e:
    print("   Connection Failed!")
    traceback.print_exc()

print("\n2. Testing authentication logic...")
try:
    result = authenticate_with_odoo(login, password)
    print("   Authenticate Result:", result)
except Exception as e:
    print("   Authenticate Failed!")
    traceback.print_exc()
