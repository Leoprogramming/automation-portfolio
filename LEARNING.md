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

## 2026-06-10 → 2026-07-07 — Project 3: MCP Server

**Goal:** Expose the Project 2 Airtable job tracker as tools a Claude session
can call directly, via a custom MCP server deployed over HTTPS.

**Done:**

- Built a TypeScript/Express MCP server using `@modelcontextprotocol/sdk`,
  implementing three tools: `list_recent_jobs`, `get_job_by_slug`,
  `update_job_status`
- Deployed to Fly.io (Frankfurt, 256MB shared CPU, auto-stop when idle),
  HTTPS-only, behind bearer auth
- Verified end-to-end: Claude calling tools → Fly.io → Airtable read/write

**What I learned:**

- MCP has two transport modes. Stdio launches a local subprocess and
  communicates over stdin/stdout — fine for a tool that runs on your own
  machine. StreamableHTTP is for remote servers reachable over a network.
  Since this server's job is to call Airtable (already remote), HTTP transport
  was the right choice — no reason to run it as a local process.
- Stateless is the right default for an HTTP MCP server. The first
  working version shared one transport instance across all requests. That
  caused 500 errors on the second request because the transport had already
  been used and closed. Fix: create a new `StreamableHTTPServerTransport` per
  POST, close it on response. No shared state between requests.
- Container processes binding to `127.0.0.1` are invisible outside the
  container. The first Fly deploy was unreachable because the server was
  listening on localhost. Changing to `0.0.0.0` fixed it. This is a general
  rule for anything containerised.
- Multi-stage Docker builds: stage 1 compiles TypeScript, stage 2 copies
  only `dist/` and prod dependencies. Keeps the image lean and avoids
  shipping `devDependencies` or source files.
- Timing-safe token comparison matters for auth. `===` on strings short-
  circuits on the first mismatched byte, leaking timing information about how
  close a guess is. `crypto.timingSafeEqual` runs in constant time regardless
  of where the strings diverge.
- Zod validation at the input boundary, before any outbound call. The slug
  field is used directly in an Airtable `filterByFormula` string. Validating
  it against `^[a-z0-9-]+$` means any input that could break the formula —
  quotes, spaces, injection characters — is rejected by the MCP layer before
  it ever reaches Airtable.
- Fly secrets via `flyctl secrets import` from a gitignored file. Never
  committed; the gitignored `.env.production` is the source of truth for
  what's in Fly's secret store.

**What failed / what confused me:**

- Shared transport across requests causing 500s on the second call. The
  error message was generic ("Internal server error") and the root cause
  wasn't obvious until reading the MCP SDK source and understanding that a
  transport is a one-shot object — use it once, close it.
- First deploy was unreachable (connection refused from outside the
  container). The startup log said `listening on port 3000`, which looked
  correct, but the bind address was `127.0.0.1`. The fix is obvious in
  retrospect but `0.0.0.0` isn't something you think about until you hit it
  for the first time in a container.
- Swallowed errors early on. Before adding the error log on the MCP request
  handler, failures were silent — the handler returned 500 with no log. Hard
  to debug. Errors surface immediately now.

**Key decisions:**

- `list_recent_jobs` returns a slim index (no description field). Job
  descriptions are long; fetching 10 of them into a tool result is expensive
  context-wise. The index is for browsing; `get_job_by_slug` is for reading
  the full posting.
- `update_job_status` uses a strict Zod enum for the `status` field. Free-
  form text would let the model write whatever it wants to Airtable. Enums
  prevent that at the type level.
- Single file (`server.ts`, ~300 lines). At this size, splitting into
  modules adds navigation overhead without any clarity benefit.
