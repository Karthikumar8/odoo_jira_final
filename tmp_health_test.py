import urllib.request, json

BASE = "http://127.0.0.1:8000/api"

req = urllib.request.Request(f"{BASE}/auth/login/", data=json.dumps({"login": "saikrishna.v@primesoftinc.com", "password": "Krishna12#"}).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read().decode())
    token = data["access"]

print("Role:", data.get("user", {}).get("role"))

req = urllib.request.Request(f"{BASE}/reporting/project-health/", headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req, timeout=15) as r:
    body = json.loads(r.read().decode())
    projects = body.get("projects", [])
    print(f"Projects found: {len(projects)}")
    for p in projects[:3]:
        print(f"  {p['name']} alloc={p['allocated']} eff={p['effective']} usage={p['usage_pct']}% status={p['health_status']}")
    if not projects:
        print("ERROR body:", body)
