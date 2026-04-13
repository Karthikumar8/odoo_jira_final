import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from services.odoo_client import odoo_call
from datetime import datetime, timedelta

today_str = datetime.now().strftime("%Y-%m-%d")
week_ago_str = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

uid = 26
project_domain = [["active", "=", True]]
task_domain = [["active", "=", True], ["user_ids", "in", [uid]]]
ts_domain = [["date", ">=", week_ago_str], ["employee_id.user_id", "=", uid]]

print("p count")
odoo_call("project.project", "search_count", [project_domain])
print("t count")
odoo_call("project.task", "search_count", [task_domain])

overdue_domain = task_domain + [["date_deadline", "<", today_str], ["is_closed", "=", False]]
try:
    print("overdue")
    odoo_call("project.task", "search_count", [overdue_domain])
except Exception as e:
    print("overdue error:", e)
    odoo_call("project.task", "search_count", task_domain + [["date_deadline", "<", today_str]])

print("ts group")
odoo_call("account.analytic.line", "read_group", kwargs={"domain": ts_domain, "fields": ["unit_amount"], "groupby": []})

print("recent p")
odoo_call("project.project", "search_read", [project_domain], {
    "fields": ["id", "name"], 
    "limit": 5, 
    "order": "create_date desc"
})

print("my tasks")
my_tasks_domain = [["active", "=", True], ["user_ids", "in", [uid]]]
odoo_call("project.task", "search_read", [my_tasks_domain], {
    "fields": ["id", "name", "project_id", "date_deadline", "priority"], 
    "limit": 5, 
    "order": "date_deadline asc"
})
print("ALL DONE")
