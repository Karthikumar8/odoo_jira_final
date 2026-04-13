import xmlrpc.client

url = "https://edu-primesoft.odoo.com"
db = "edu-primesoft"
login = "saikrishna.v@primesoftinc.com"
password = "Krishna12#"

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, login, password, {})

models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
project_fields = models.execute_kw(db, uid, password, 'project.project', 'fields_get', [], {'attributes': ['string', 'type']})

requested = [
    "id", "name", "description", "partner_id", "user_id", "tag_ids",
    "date_start", "date", "allocated_hours", "effective_hours",
    "progress", "privacy_visibility", "allow_timesheets",
    "allow_milestones", "allow_task_dependencies", "allow_recurring_tasks",
    "stage_id", "task_count", "color", "company_id", "active"
]

for f in requested:
    if f not in project_fields:
        print(f"MISSING FIELD: {f}")
print("Done project.project")
