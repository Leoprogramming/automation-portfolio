# Job Posting Tracker

An n8n automation that scrapes Berlin job postings daily from multiple search terms, deduplicates against Airtable, scores each new job against a candidate profile using OpenAI, and generates a cover letter draft for strong matches using Claude Haiku.

## Architecture

```
Schedule Trigger (9:30am Berlin, daily)
→ HTTP Request (n8n) ─────┐
→ HTTP Request (AI eng.) ─┴→ Merge API Results
                               → Code (Berlin filter, cross-source dedup, HTML strip)
                               → fork ──→ Merge (Input 1)
                                      └──→ Search records (Airtable, Execute Once)
                                                └──→ Merge (Input 2)
                                                        → Code (dedup vs Airtable)
                                                        → Score Job (OpenAI GPT-4o-mini)
                                                        → Parse Score
                                                        → Score >= 6?
                                                            ├── true  → Generate Cover Draft (Claude Haiku)
                                                            │            → Parse Cover Draft
                                                            │            → Create record (high match)
                                                            └── false → Create record (low match)
```

**Trigger:** Schedule, 9:30am Berlin daily
**State:** Airtable — n8n is stateless, all job records live here
**Dedup:** slug-based Code node after parallel merge of API results + existing Airtable records
**Branch:** IF score ≥ 6 — above gets cover draft written to Airtable, below gets written without one

→ Step-by-step breakdown and design decisions below.

## What it does

1. **Schedule Trigger** — fires at 9:30am Berlin time every day (`0 30 9 * * *`)
2. **HTTP Request (n8n)** — fetches postings from Arbeitnow API with search term `n8n`
3. **HTTP Request (AI engineer)** — fetches postings from Arbeitnow API with search term `AI automation engineer`
4. **Merge API Results** — combines both API responses into one stream
5. **Code node (filter + dedup across sources)** — filters to Berlin jobs, deduplicates by slug across both API results, strips HTML from descriptions, normalises fields
6. **Fork** — Berlin jobs go to both the Merge node (Input 1) and the Airtable Search node
7. **Search records** — fetches all existing Airtable records in a single call (`Execute Once: on`), passes them to Merge (Input 2)
8. **Merge (Append)** — combines API jobs and Airtable records so the dedup node can compare
9. **Code node (dedup vs Airtable)** — identifies Airtable records by `id.startsWith('rec')`, builds a Set of existing slugs, returns only genuinely new jobs
10. **Score Job** — OpenAI GPT-4o-mini scores each new job 1-10 against the candidate profile, returns structured JSON
11. **Parse Score** — extracts score and metadata from the LLM response, merges back with job fields
12. **Score >= 6?** — IF node: true branch for strong matches, false branch for weak matches
13. **Generate Cover Draft** (true branch) — Anthropic Claude Haiku generates a 2-paragraph cover letter opening via HTTP request to Anthropic API
14. **Parse Cover Draft** — extracts cover letter text from Anthropic response
15. **Create record (high match)** — writes to Airtable with all fields including `cover_draft`
16. **Create record (low match)** — writes to Airtable with all fields, `cover_draft` left empty

## Why dual API search

A single `AI+automation` query misses roles tagged differently (e.g. `n8n`, `workflow automation`). Two parallel requests with different terms — merged and deduped by slug before any further processing — broadens coverage without adding complexity downstream.

## Why Merge instead of Search + IF (dedup)

The naive approach — search Airtable per job, skip if found — breaks when Airtable is empty: the Search node returns 0 items and n8n stops the flow entirely. Nothing gets created.

The fix: fetch all existing records once in parallel, merge both streams, then dedup in a single Code node. This works regardless of whether the table is empty or has thousands of records.

## Scoring prompt

The OpenAI node sends each job's title, company, tags, and first 1500 chars of description to GPT-4o-mini with this profile:

```
CANDIDATE PROFILE:
- Skills: JavaScript, TypeScript, React, Next.js, Node.js, n8n workflow automation,
  LLM APIs (OpenAI/Anthropic), Docker, MCP servers
- Level: Junior
- Location: Berlin
- Target: Junior AI Automation Engineer roles

SCORING RULES:
- Penalize seniority mismatch: senior/lead/manager roles score 4 or below
- Score 7-10 only for junior, Werkstudent, or entry-level roles with strong tech match
```

Returns: `{ score, matching_skills, missing_skills, match_reason }`

## Cover letter prompt

For jobs scoring ≥ 6, Claude Haiku receives:

```
Write a personalized 2-paragraph cover letter opening (under 150 words).
Position: [title] at [company]
About me: Junior AI Automation Engineer, Berlin. JS/TS/React/Node background,
now focused on n8n, LLM APIs, Docker, MCP servers.
Why I fit: [match_reason from scoring step]
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
| score | Number | 1-10 from GPT-4o-mini |
| matching skills | Text | from scoring step |
| missing skills | Text | from scoring step |
| match reason | Text | one-sentence explanation from scoring step |
| cover draft | Long text | generated by Claude Haiku for scores ≥ 6 |
| status | Single select | To Review / Applied / Interview / Rejected |
| notified | Checkbox | |
| source | Text | hardcoded "Arbeitnow" |

## Stack

- n8n (self-hosted via Docker)
- Arbeitnow public API (free, no auth required)
- OpenAI GPT-4o-mini (scoring)
- Anthropic Claude Haiku (cover draft generation)
- Airtable (Personal Access Token)

## How to run

1. Import `job-tracker.json` into your n8n instance
2. Set up credentials:
   - Airtable Personal Access Token with `data.records:read`, `data.records:write`, `schema.bases:read` scopes
   - OpenAI API key
   - Anthropic API key
3. Create an Airtable base with the schema above
4. **Replace the placeholders in the imported workflow.** The exported JSON ships with `appREPLACE_ME` (base ID) and `tblREPLACE_ME` (table ID) so the file is portable. In every Airtable node, swap these for your real base and table IDs before the workflow will run.
5. Publish the workflow

## Confirmed working

Both branches tested on 2026-06-10:
- **High match (score 8):** Werkstudent Web Development at Teclead Ventures → cover draft generated and written to Airtable
- **Low match (scores 1-4):** 14 jobs written to Airtable with empty `cover_draft`
