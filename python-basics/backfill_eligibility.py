import os
import re
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

API_KEY = os.getenv("AIRTABLE_PAT")
BASE_ID = os.getenv("AIRTABLE_BASE_ID")
TABLE_ID = os.getenv("AIRTABLE_TABLE_ID")

BASE_URL = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

STUDENT_RE = re.compile(
    r"werkstudent|working student|praktikum|ausbildung|internship|hilfstätigkeit|student \(college\)",
    re.IGNORECASE,
)
SENIORITY_RE = re.compile(
    r"\bsenior\b|\bteam lead\b|\btech lead\b|\bprincipal\b|\bhead of\b|manager\b|leiter(in)?\b|leitung\b",
    re.IGNORECASE,
)


def fetch_all_records():
    records = []
    params = {}
    while True:
        response = requests.get(BASE_URL, headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()
        records.extend(data["records"])
        offset = data.get("offset")
        if not offset:
            break
        params["offset"] = offset
    return records


def classify(title, job_types):
    student_match = STUDENT_RE.search(title) or STUDENT_RE.search(job_types)
    if student_match:
        return False, f"filtered: {student_match.group(0).lower()}"
    seniority_match = SENIORITY_RE.search(title)
    if seniority_match:
        return False, f"filtered: {seniority_match.group(0).lower()}"
    return True, ""


DRY_RUN = False  # flip to False when ready to write


def patch_record(record_id, fields):
    response = requests.patch(
        f"{BASE_URL}/{record_id}",
        headers=HEADERS,
        json={"fields": fields},
    )
    response.raise_for_status()


records = fetch_all_records()
print(f"Fetched {len(records)} records")

to_patch = [r for r in records if "eligible" not in r["fields"]]
print(f"Records missing eligible field: {len(to_patch)}")

patched = 0
for record in to_patch:
    fields = record["fields"]
    title = fields.get("title", "")
    job_types = fields.get("job types", "")
    eligible, reason = classify(title, job_types)
    status = "ineligible" if not eligible else "eligible"
    label = f"  {title[:60]} → {status}" + (f" ({reason})" if reason else "")
    if DRY_RUN:
        print(f"[DRY RUN] {label}")
    else:
        patch_record(record["id"], {"eligible": eligible, "eligibility_reason": reason})
        print(label)
    patched += 1

print(f"\nDone. {'Would patch' if DRY_RUN else 'Patched'} {patched} records.")
