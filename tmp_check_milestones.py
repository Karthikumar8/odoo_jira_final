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
        
        urlM = "http://127.0.0.1:8000/api/milestones/?project_id=16"
        reqM = urllib.request.Request(urlM, headers={'Authorization': f'Bearer {token}'})
        
        with urllib.request.urlopen(reqM) as resM:
            print("Status:", resM.status)
            body = resM.read().decode('utf-8')
            print("Data:", body)

except Exception as e:
    if hasattr(e, 'read'):
        print("Error HTTP:", e.read().decode('utf-8'))
    else:
        print("Error:", e)
