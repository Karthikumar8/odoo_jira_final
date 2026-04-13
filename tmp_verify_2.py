import urllib.request
import json
import uuid

urlLogin = "http://127.0.0.1:8000/api/auth/login/"
dataLogin = json.dumps({"login": "saikrishna.v@primesoftinc.com", "password": "Krishna12#"}).encode('utf-8')

try:
    reqL = urllib.request.Request(urlLogin, data=dataLogin, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(reqL) as response:
        token = json.loads(response.read().decode('utf-8'))["access"]
        auth_header = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

        # 1. Activities scheduling
        urlAC = "http://127.0.0.1:8000/api/activities/"
        dataAC = json.dumps({
            "summary": f"Verify {uuid.uuid4().hex[:4]}", 
            "res_id": 103, 
            "res_model": "project.task",
            "activity_type_id": 1
        }).encode('utf-8')
        
        reqAC = urllib.request.Request(urlAC, data=dataAC, headers=auth_header)
        with urllib.request.urlopen(reqAC) as resAC:
            print("Act Create:", resAC.status, resAC.read().decode('utf-8'))
            
        urlAL = "http://127.0.0.1:8000/api/activities/?res_id=103&res_model=project.task"
        reqAL = urllib.request.Request(urlAL, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(reqAL) as resAL:
            print("Act Load:", resAL.status, resAL.read().decode('utf-8'))

        # 2. Chatter posting
        urlMC = "http://127.0.0.1:8000/api/activities/messages/"
        dataMC = json.dumps({"res_id": 103, "res_model": "project.task", "body": "Chatter Test"}).encode('utf-8')
        reqMC = urllib.request.Request(urlMC, data=dataMC, headers=auth_header)
        with urllib.request.urlopen(reqMC) as resMC:
            print("Msg Create:", resMC.status, resMC.read().decode('utf-8'))

except Exception as e:
    if hasattr(e, 'read'): print("Error:", e.read().decode('utf-8'))
    else: print("Error:", e)
