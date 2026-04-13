import urllib.request
import json

url = "http://127.0.0.1:8000/api/auth/login/"
data = json.dumps({
    "login": "saikrishna.v@primesoftinc.com",
    "password": "Krishna12#"
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Failed with status:", e.code)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
