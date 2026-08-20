import urllib.request
import urllib.parse
import json

base_url = "http://127.0.0.1:8080/api/v1/auth/login"

accounts = [
    ("DOCTOR", "doctor@suyog.com", "doctor123"),
    ("PHARMACIST", "pharmacist@suyog.com", "pharmacist123"),
    ("ADMIN", "admin@prescripto.com", "admin123"),
]

for role, email, password in accounts:
    data = urllib.parse.urlencode({"username": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        base_url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] {role} Login Successful: user_id={body.get('user_id')}, role={body.get('role')}")
    except Exception as e:
        print(f"[ERROR] {role} Login Failed: {e}")
