# Learning Log

Running journal of decisions, mistakes, and what I learned building toward AI Automation Engineer roles.

## 2026-04-22 — Day 0

**Goal:** Get n8n running locally via Docker, set up portfolio repo.

**Done:**

- Installed docker-compose-v2 plugin (was missing from base Docker install on Ubuntu 24.04)
- Added user to docker group so commands work without sudo
- Created Docker Compose config for n8n with persistent volume for data
- n8n running at http://localhost:5678
- Built first trivial workflow (Manual Trigger → Edit Fields → outputs hello world)
- Created portfolio repo structure

**What I learned:**

- Docker Compose v2 is a plugin now, not a separate `docker-compose` binary
- n8n persists data via a mounted volume — without that, workflows die when container restarts
- `newgrp docker` swaps group membership in current shell instead of needing logout/login
- N8N_SECURE_COOKIE=false needed for localhost dev; would be true in production with HTTPS

**Next:**

- Tomorrow: read n8n core concepts docs (nodes, triggers, credentials, expressions)
- Build 3 real workflows of increasing complexity

## What confused me / lessons

- SSH key already existed but wasn't on GitHub account → had to add it
- Used `sudo git push` which broke things — git should never run as sudo
- GitHub rotated SSH host keys at some point, old known_hosts entry caused warning
- NordVPN occasionally interferes with SSH to github.com (note for future)
- Docker Compose v2 is a separate apt package on Ubuntu, not bundled with docker.io

# Extra learning notes:

Project was very straighforward and the workflow surprised me with how easy and intuitive it was. Small hiccups were only setting up credentials, syncing accounts between emails, visualizing the whole architecture, although very simple, understand how n8n works and how to link workflows such as the error-handler etc

## 2026-04-30 — Project 2 kickoff

Airtable schema done (19 fields). Stopped before API token. Next: get PAT from airtable.com/create/tokens, add to n8n as credential, then build the flow.

## 2026-05-06 — Project 2 complete (Week 3)

**Goal:** Get scraping + deduplication working reliably end-to-end.

**Done:**

- Built full n8n workflow: Schedule Trigger → HTTP Request (Arbeitnow) → Code (Berlin filter + HTML strip) → parallel [Airtable List + Berlin jobs] → Merge → Code (dedup) → Airtable Create
- 26 real Berlin job postings landed in Airtable on first run, all fields populated
- Second run: dedup code received 52 items (26 existing + 26 API), output 0 — count stayed at 26
- Workflow published and running on schedule: 9:30am Berlin time daily

**What I learned:**

- n8n stops a flow when a node outputs 0 items — this killed the Search+IF dedup approach. Fix: run both streams in parallel, merge, dedup in a Code node.
- Identifying Airtable records in a merged stream: check `item.json.id.startsWith('rec')`.
- "No output data returned" from a dedup node is a success condition, not an error.
- n8n cron uses 6 fields, not 5. `30 9 * * *` is wrong; `0 30 9 * * *` is correct.
- Airtable "Automap" mode requires JSON field names to exactly match column names.

**What confused me:**

- Why Search returning 0 items kills everything downstream — n8n is item-driven, not event-driven. No items = flow stops.
- The Merge architecture felt unintuitive at first, but it's the only way to have both streams in the same place for comparison.

**Next (Week 4):**

- Add OpenAI scoring node: score each new job 1-10 against my profile
- Add Claude Haiku cover draft node for top-scored jobs

# Week 4 complete — 2026-06-10

Both branches confirmed working on 2026-06-10:
- High match (score 8): Werkstudent Web Dev at Teclead Ventures → cover draft generated ✅
- Low match (scores 1-4): 14 jobs written without cover draft ✅

Final Week 4 state:
- Dual API search (n8n + AI automation engineer) merged before processing
- Score threshold lowered from 7 to 6 to cast wider net
- Claude Haiku called via HTTP Request node with anthropicApi credential (not native n8n node)
- All files committed: job-tracker.json, job-tracker-README.md, PLANNING-CONTEXT.md
