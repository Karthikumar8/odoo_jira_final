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
        print("Login OK!")
        
        urlProjects = "http://127.0.0.1:8000/api/projects/"
        reqP = urllib.request.Request(urlProjects, headers={'Authorization': f'Bearer {token}'})
        
        try:
            with urllib.request.urlopen(reqP) as resP:
                print("Projects Status:", resP.status)
                body = resP.read().decode('utf-8')
                print("Projects list retrieved:", len(json.loads(body)))
        except urllib.error.HTTPError as e:
            print("Project Failed with status:", e.code)
            print("Body:", e.read().decode('utf-8'))

except Exception as e:
    print("Error:", e)
