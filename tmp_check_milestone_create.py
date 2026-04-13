import urllib.request
import json

urlLogin = "http://127.0.0.1:8000/api/auth/login/"
dataLogin = json.dumps({
    "login": "saikrishna.v@primesoftinc.com",
    "password": "Krishna12#"
}).encode('utf-8')

reqL = urllib.request.Request(urlLogin, data=dataLogin, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(reqL) as response:
        payload = json.loads(response.read().decode('utf-8'))
        token = payload["access"]
        
        # Test Create
        urlMC = "http://127.0.0.1:8000/api/milestones/"
        dataMC = json.dumps({"name": "Test", "project_id": 16}).encode('utf-8')
        reqMC = urllib.request.Request(urlMC, data=dataMC, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
        
        with urllib.request.urlopen(reqMC) as resMC:
            print("Create Status:", resMC.status)
            body = resMC.read().decode('utf-8')
            print("Create Data:", body)
            new_id = json.loads(body).get("id")

        if new_id:
            # Test Toggle
            urlMR = f"http://127.0.0.1:8000/api/milestones/{new_id}/reach/"
            reqMR = urllib.request.Request(urlMR, method="PATCH", headers={'Authorization': f'Bearer {token}'})
            with urllib.request.urlopen(reqMR) as resMR:
                print("Reach Data:", resMR.read().decode('utf-8'))

except Exception as e:
    if hasattr(e, 'read'):
        print("Error HTTP:", e.read().decode('utf-8'))
    else:
        print("Error:", e)
