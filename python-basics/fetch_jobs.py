import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

API_KEY = os.getenv("AIRTABLE_PAT")
BASE_ID = os.getenv("AIRTABLE_BASE_ID")
TABLE_ID = os.getenv("AIRTABLE_TABLE_ID")

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"
headers = {"Authorization": f"Bearer {API_KEY}"}

response = requests.get(url, headers=headers)
response.raise_for_status()

data = response.json()
records = data["records"]

print(f"Total records: {len(records)}")

for record in records[:10]:
    fields = record["fields"]
    title = fields.get("title", "No title")
    score = fields.get("score", "N/A")
    print(f"{title} — score: {score}")
