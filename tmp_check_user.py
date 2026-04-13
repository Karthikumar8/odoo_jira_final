import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from services.odoo_client import odoo_call
from services.odoo_auth import authenticate_with_odoo

login = "saikrishna.v@primesoftinc.com"
password = "Krishna12#"

# Check if user exists
users = odoo_call("res.users", "search_read", [[["login", "ilike", "saikrishna"]]], {"fields": ["id", "login", "name", "email", "active"]})
print(f"User search results: {users}")

# Test authentication natively
profile = authenticate_with_odoo(login, password)
print(f"Authentication with {login} / {password} resulted in: {profile}")
