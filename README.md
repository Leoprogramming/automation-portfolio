# AI Automation Portfolio — Leonardo Costa

Junior AI Automation Engineer portfolio. Built while transitioning back into tech, targeting Berlin market, August-October 2026.

## Projects

### ✅ Project 1: Email Triage System v2

**Stack:** n8n · OpenAI API · Gmail API · Google Sheets  
**What it does:** Monitors Gmail, classifies emails with GPT-4o-mini (urgency, category, summary), logs to Sheets, auto-labels high-urgency emails.  
**Why it matters:** Rebuilt from a broken Zapier prototype. Demonstrates production thinking: structured outputs, credential management, error handling, audit logging.  
[README](workflows/email-triage-v2-README.md) · [Workflow JSON](workflows/email-triage-v2.json)

### ✅ Project 2: Job Posting Tracker

**Stack:** n8n · Airtable · Arbeitnow API · JavaScript  
**What it does:** Scrapes Berlin job postings daily at 9:30am, deduplicates against Airtable using slug matching, writes only new records with 19 fields pre-mapped for AI scoring.  
**Why it matters:** Solves a real n8n gotcha — the naive Search+IF dedup breaks when the table is empty (0 items stops the flow). Fixed with a Merge architecture that works at any table size.  
[README](workflows/job-tracker-README.md) · [Workflow JSON](workflows/job-tracker.json)

### 📅 Project 3: Custom MCP Server (planned Week 6-7)

### 📅 Project 4: Next.js Dashboard (planned Week 8, optional)

## Stack

n8n · OpenAI API · Anthropic API · JavaScript · Python (planned) · Docker · Supabase
