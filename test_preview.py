import requests

url = "http://localhost:5000/api/preview"
payload = {
    "filename": "Cơ sở giáo dục thường xuyên.xlsx",
    "level": "GDTX"
}
try:
    response = requests.post(url, json=payload, timeout=5)
    print("Status:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("Error:", e)
