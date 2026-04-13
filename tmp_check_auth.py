import xmlrpc.client

url = "https://edu-primesoft.odoo.com"
db = "edu-primesoft"
login = "saikrishna.v@primesoftinc.com"
password = "Krishna12#"

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, login, password, {})

models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
users = models.execute_kw(db, uid, password, 'res.users', 'search_read', [[["login", "=", "admin"]]], {"fields": ["id", "login"]})
print("admin user search:", users)
