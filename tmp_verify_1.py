import urllib.request
import json
import uuid

urlLogin = "http://127.0.0.1:8000/api/auth/login/"
dataLogin = json.dumps({"login": "saikrishna.v@primesoftinc.com", "password": "Krishna12#"}).encode('utf-8')

try:
    reqL = urllib.request.Request(urlLogin, data=dataLogin, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(reqL) as response:
        token = json.loads(response.read().decode('utf-8'))["access"]
        
        # 1. Timesheet testing
        urlTC = "http://127.0.0.1:8000/api/timesheets/"
        dataTC = json.dumps({"name": f"Test TS {uuid.uuid4().hex[:4]}", "task_id": 103, "project_id": 16, "unit_amount": 1.5}).encode('utf-8')
        reqTC = urllib.request.Request(urlTC, data=dataTC, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
        
        with urllib.request.urlopen(reqTC) as resTC:
            print("TS Create:", resTC.status, resTC.read().decode('utf-8'))
            
        urlTL = "http://127.0.0.1:8000/api/timesheets/?task_id=103"
        reqTL = urllib.request.Request(urlTL, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(reqTL) as resTL:
            print("TS Load:", resTL.status, resTL.read().decode('utf-8'))

except Exception as e:
    if hasattr(e, 'read'): print("Error:", e.read().decode('utf-8'))
    else: print("Error:", e)
