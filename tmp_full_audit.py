import urllib.request, json, sys

BASE = "http://127.0.0.1:8000/api"

def post(url, data, headers={}):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={**headers, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, str(e)

def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read().decode())
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, str(e)

print("=== LOGIN ===")
status, data = post(f"{BASE}/auth/login/", {"login": "saikrishna.v@primesoftinc.com", "password": "Krishna12#"})
print(f"  {status}: user={data.get('user', {}).get('name')}, role={data.get('user', {}).get('role')}")
if status != 200:
    print("  FAIL - cannot proceed"); sys.exit(1)

token = data["access"]
user = data["user"]
print(f"  employee_id={user.get('employee_id')}, odoo_uid={user.get('odoo_uid')}")

print("\n=== PROJECTS ===")
s, d = get(f"{BASE}/projects/", token)
print(f"  List: {s}, count={len(d) if isinstance(d, list) else d}")
if isinstance(d, list) and d:
    pid = d[0]["id"]
    print(f"  Using project id={pid}, name={d[0].get('name')}")
    s2, d2 = get(f"{BASE}/projects/{pid}/", token)
    print(f"  Detail: {s2}")
else:
    pid = 16

print("\n=== STAGES ===")
s, d = get(f"{BASE}/stages/?project_id={pid}", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")
stage_id = d[0]["id"] if isinstance(d, list) and d else None

print("\n=== TASKS ===")
s, d = get(f"{BASE}/tasks/?project_id={pid}", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")
task_id = d[0]["id"] if isinstance(d, list) and d else 103

print("\n=== TASK METADATA ===")
s, d = get(f"{BASE}/tasks/metadata/", token)
print(f"  {s}, keys={list(d.keys()) if isinstance(d, dict) else d}")

print(f"\n=== TIMESHEETS (task_id={task_id}) ===")
s, d = get(f"{BASE}/timesheets/?task_id={task_id}", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")

print(f"\n=== TIMESHEETS (project_id={pid}) ===")
s, d = get(f"{BASE}/timesheets/?project_id={pid}", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")

print(f"\n=== MILESTONES (project_id={pid}) ===")
s, d = get(f"{BASE}/milestones/?project_id={pid}", token)
print(f"  {s}, data={d}")

print(f"\n=== ACTIVITIES (task_id={task_id}) ===")
s, d = get(f"{BASE}/activities/?res_id={task_id}&res_model=project.task", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")

print(f"\n=== MESSAGES (task_id={task_id}) ===")
s, d = get(f"{BASE}/activities/messages/?res_id={task_id}&res_model=project.task", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")

print(f"\n=== ACTIVITY METADATA ===")
s, d = get(f"{BASE}/activities/metadata/", token)
print(f"  {s}, types={len(d.get('activity_types', [])) if isinstance(d, dict) else d}")

print(f"\n=== UPDATES (project_id={pid}) ===")
s, d = get(f"{BASE}/updates/?project_id={pid}", token)
print(f"  {s}, count={len(d) if isinstance(d, list) else d}")

print(f"\n=== REPORTING ENDPOINTS ===")
for ep in ["project-health", "leaderboard", "overdue-tasks"]:
    s, d = get(f"{BASE}/reporting/{ep}/", token)
    print(f"  {ep}: {s}")
