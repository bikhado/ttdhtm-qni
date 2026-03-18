import requests

url = "http://localhost:5000/api/import-khuyettat"
payload = {
    "filename": "Giáo dục khuyết tật.xlsx",
    "year": "2024-2025",
    "db_type": "sqlite"
}
try:
    response = requests.post(url, json=payload, timeout=10)
    print("Status:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("Error:", e)
