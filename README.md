# AI Automation Portfolio — Leonardo Costa

Junior AI Automation Engineer portfolio. Built while transitioning back into tech, targeting Berlin market, late June / early July 2026.

## Projects

### ✅ Project 1: Email Triage System v2

**Stack:** n8n · OpenAI API · Gmail API · Google Sheets  
**What it does:** Monitors Gmail, classifies emails with GPT-4o-mini (urgency, category, summary), logs to Sheets, auto-labels high-urgency emails.  
**Why it matters:** Rebuilt from a broken Zapier prototype. Demonstrates production thinking: structured outputs, credential management, error handling, audit logging.  
[README](workflows/email-triage-v2-README.md) · [Workflow JSON](workflows/email-triage-v2.json)

### ✅ Project 2: Job Posting Tracker

**Stack:** n8n · OpenAI GPT-4o-mini · Anthropic Claude Haiku · Airtable · Arbeitnow API · JavaScript  
**What it does:** Scrapes Berlin job postings daily at 9:30am via two parallel API searches, deduplicates against Airtable, scores each new job 1-10 against a candidate profile using GPT-4o-mini, and generates a cover letter draft for jobs scoring ≥ 6 using Claude Haiku. Live since late May 2026.  
**Real numbers (June 2026):** 134 jobs tracked · 34 scored by GPT · 1 cover draft generated (score 8 at Teclead Ventures)  
**Why it matters:** Solves a real n8n gotcha — the naive Search+IF dedup breaks when the table is empty (0 items stops the flow). Fixed with a Merge architecture that works at any table size. The dual-API search pattern (two parallel queries merged before dedup) is a genuine pattern for production-quality scrapers.  
[README](workflows/job-tracker-README.md) · [Workflow JSON](workflows/job-tracker.json)

### 📅 Project 3: Custom MCP Server (planned Week 6-7)

### 📅 Project 4: Next.js Dashboard (planned Week 8, optional)

## Stack

n8n · OpenAI API · Anthropic API · JavaScript · Python (planned) · Docker
