import urllib.request
import urllib.parse
import json

url = "http://127.0.0.1:8080/api/v1/auth/login"
data = urllib.parse.urlencode({
    "username": "doctor@suyog.com",
    "password": "doctor123"
}).encode("utf-8")

req = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("✅ LOGIN SUCCESSFUL!")
        print("Token:", res.get("access_token")[:30] + "...")
        print("Role:", res.get("role"))
        print("User ID:", res.get("user_id"))
except Exception as e:
    print("❌ LOGIN ERROR:", e)
