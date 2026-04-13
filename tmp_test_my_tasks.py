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
        
        urlTasks = "http://127.0.0.1:8000/api/reporting/my-tasks/"
        reqT = urllib.request.Request(urlTasks, headers={'Authorization': f'Bearer {token}'})
        
        try:
            with urllib.request.urlopen(reqT) as resT:
                print("MyTasks Status:", resT.status)
                body = resT.read().decode('utf-8')
                print("MyTasks Data:", body)
        except urllib.error.HTTPError as e:
            print("Failed with status:", e.code)
            print("Body:", e.read().decode('utf-8'))

except Exception as e:
    print("Error:", e)
