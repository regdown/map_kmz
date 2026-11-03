import uuid
import requests
print("Creating category...")
r = requests.post("http://localhost:8000/categories/", json={"name": "Test Cat"})
print(r.json())
