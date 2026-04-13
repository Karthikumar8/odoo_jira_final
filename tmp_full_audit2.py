import urllib.request, json

BASE = "http://127.0.0.1:8000/api"

def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read().decode())
            return r.status, body
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, e.reason

# Login
req = urllib.request.Request(f"{BASE}/auth/login/", data=json.dumps({"login": "saikrishna.v@primesoftinc.com", "password": "Krishna12#"}).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read().decode())
    token = data["access"]

pid = 25
task_id = None
s, tasks = get(f"{BASE}/tasks/?project_id={pid}", token)
if isinstance(tasks, list) and tasks:
    task_id = tasks[0]["id"]
print(f"task_id={task_id}")

print("\n=== /tasks/metadata/all/ ===")
s, d = get(f"{BASE}/tasks/metadata/all/", token)
print(f"  {s}: {list(d.keys()) if isinstance(d, dict) else d}")

print("\n=== TIMESHEETS ===")
s, d = get(f"{BASE}/timesheets/?task_id={task_id}", token)
print(f"  task: {s}, count={len(d) if isinstance(d,list) else d}")
s, d = get(f"{BASE}/timesheets/?project_id={pid}", token)
print(f"  project: {s}, count={len(d) if isinstance(d,list) else d}")

print("\n=== MILESTONES ===")
s, d = get(f"{BASE}/milestones/?project_id={pid}", token)
print(f"  {s}: {d}")

print("\n=== ACTIVITIES ===")
s, d = get(f"{BASE}/activities/?res_id={task_id}&res_model=project.task", token)
print(f"  {s}: count={len(d) if isinstance(d,list) else d}")

print("\n=== MESSAGES ===")
s, d = get(f"{BASE}/activities/messages/?res_id={task_id}&res_model=project.task", token)
print(f"  {s}: count={len(d) if isinstance(d,list) else d}")

print("\n=== ACTIVITY METADATA ===")
s, d = get(f"{BASE}/activities/metadata/", token)
print(f"  {s}: types={len(d.get('activity_types',[])) if isinstance(d,dict) else d}")

print("\n=== UPDATES ===")
s, d = get(f"{BASE}/updates/?project_id={pid}", token)
print(f"  {s}: count={len(d) if isinstance(d,list) else d}")
