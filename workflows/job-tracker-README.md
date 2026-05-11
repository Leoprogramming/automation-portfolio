# Job Posting Tracker

An n8n automation that scrapes Berlin job postings daily, deduplicates against an Airtable database, and writes only new records — with fields pre-mapped for AI scoring and cover letter generation in the next phase.

## What it does

1. **Schedule Trigger** — fires at 9:30am Berlin time every day (`0 30 9 * * *`)
2. **HTTP Request** — fetches job postings from Arbeitnow public API, filtered by `AI+automation` and `berlin`
3. **Code node (Berlin filter + HTML strip)** — client-side filters to location containing "Berlin", strips HTML from descriptions, normalises arrays to strings, converts Unix timestamps to ISO dates
4. **Parallel fork** — Berlin jobs go to both the Merge node (Input 1) and the Airtable Search node
5. **Search records** — fetches all existing Airtable records in a single call (`Execute Once: on`), passes them to Merge (Input 2)
6. **Merge (Append)** — combines both streams into one so the dedup node can compare them
7. **Code node (dedup)** — separates Airtable records from API jobs by checking `id.startsWith('rec')`, builds a Set of existing slugs, returns only jobs not already in the table
8. **Airtable Create** — writes new records with all 19 fields mapped; sets `status` to "To Review" and leaves AI fields blank for the scoring phase

## Architecture

```
Schedule Trigger
→ HTTP Request (Arbeitnow API)
→ Code (Berlin filter, HTML strip, field normalisation)
→ fork ──→ Merge (Input 1)
       └──→ Search records (Airtable, Execute Once)
               └──→ Merge (Input 2)
                       → Code (dedup by slug)
                       → Airtable Create Record
```

## Why Merge instead of Search + IF

The naive approach — search Airtable per job, skip if found — breaks when Airtable is empty: the Search node returns 0 items and n8n stops the flow entirely. Nothing gets created.

The fix: fetch all existing records once in parallel, merge both streams, then dedup in a single Code node. This works regardless of whether the table is empty or has thousands of records.

## Dedup logic

```javascript
// Airtable records are identified by their 'rec...' ID format
const existingSlugs = new Set(
  allItems
    .filter(item => item.json.id?.startsWith('rec'))
    .map(item => item.json.slug || item.json.fields?.slug)
);
// Only pass through jobs whose slug isn't already in Airtable
```

## Airtable schema (19 fields)

| Field | Type | Notes |
|-------|------|-------|
| title | Text | |
| slug | Text | dedup key — unique per posting |
| company | Text | |
| location | Text | |
| url | URL | |
| description raw | Long text | HTML stripped |
| tags | Text | array joined to comma-separated string |
| remote | Checkbox | |
| job types | Text | array joined to comma-separated string |
| created at | Date | converted from Unix timestamp |
| scraped at | Date | ISO timestamp of when the workflow ran |
| score | Number | filled by AI scoring node (Phase 2) |
| matching skills | Text | filled by AI scoring node (Phase 2) |
| missing skills | Text | filled by AI scoring node (Phase 2) |
| match reason | Text | filled by AI scoring node (Phase 2) |
| cover draft | Long text | filled by Claude cover letter node (Phase 2) |
| status | Single select | To Review / Applied / Interview / Rejected |
| notified | Checkbox | |
| source | Text | hardcoded "Arbeitnow" |

## Stack

- n8n (self-hosted via Docker)
- Arbeitnow public API (free, no auth required)
- Airtable (Personal Access Token)

## How to run

1. Import `job-tracker.json` into your n8n instance
2. Set up credential: Airtable Personal Access Token with `data.records:read`, `data.records:write`, `schema.bases:read` scopes
3. Create an Airtable base with the schema above
4. Update the Airtable node to point at your base and table IDs
5. Publish the workflow

## What's next (Phase 2)

- OpenAI node between dedup and Create: scores each new job 1-10 against a fixed candidate profile, returns `score`, `matching_skills`, `missing_skills`, `match_reason`
- Claude Haiku node for jobs scoring ≥ 7: generates a tailored cover letter draft, writes to `cover_draft` field
