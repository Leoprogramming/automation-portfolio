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

**What confused me:**
_(fill in honestly — what didn't make sense)_

**Next:**

- Tomorrow: read n8n core concepts docs (nodes, triggers, credentials, expressions)
- Build 3 real workflows of increasing complexity

## What confused me / lessons

- SSH key already existed but wasn't on GitHub account → had to add it
- Used `sudo git push` which broke things — git should never run as sudo
- GitHub rotated SSH host keys at some point, old known_hosts entry caused warning
- NordVPN occasionally interferes with SSH to github.com (note for future)
- Docker Compose v2 is a separate apt package on Ubuntu, not bundled with docker.io
