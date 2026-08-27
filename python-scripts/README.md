# python-scripts

Standalone Python utilities against the Project 2 job tracker's Airtable base.

- `fetch_jobs.py` — pulls records from the tracker and prints the count.
- `backfill_eligibility.py` — regex-tags historical rows as student/senior/etc. so they can be filtered out.

## Run

```bash
python -m venv venv && source venv/bin/activate
pip install requests python-dotenv
# .env.local with AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID
python fetch_jobs.py
```
