# AI Automation Projects — Leonardo Costa

AI automation and LLM integration projects. n8n, OpenAI, Anthropic, MCP, TypeScript.

## Projects

### Project 1: Email Triage System v2

**Stack:** n8n · OpenAI API · Gmail API · Google Sheets  
**What it does:** Monitors Gmail, classifies emails with GPT-4o-mini (urgency, category, summary), logs to Sheets, auto-labels high-urgency emails. JSON-schema-constrained outputs, dedicated error-handling workflow, credentials in the n8n credential manager.  
[README](workflows/email-triage-v2-README.md) · [Workflow JSON](workflows/email-triage-v2.json)

### Project 2: Job Posting Tracker

**Stack:** n8n · OpenAI GPT-4o-mini · Anthropic Claude Haiku · Airtable · Arbeitnow API · JavaScript  
**What it does:** Scrapes Berlin job postings daily at 9:30am via two parallel API searches, deduplicates against Airtable, scores each new job 1-10 against a candidate profile using GPT-4o-mini, and generates a cover letter draft for strong matches using Claude Haiku. Live since May 2026.  
**Numbers (August 2026):** 657+ jobs tracked and counting · cover drafts generated for strong matches  
[README](workflows/job-tracker-README.md) · [Workflow JSON](workflows/job-tracker.json)

### Project 3: Job Tracker MCP Server

**Stack:** TypeScript · Node.js · MCP SDK · Express · Zod · Airtable REST API · Docker · Fly.io  
**What it does:** Exposes the Project 2 Airtable job tracker as three MCP tools (`list_recent_jobs`, `get_job_by_slug`, `update_job_status`) any MCP client can call directly. Deployed to Fly.io Frankfurt over HTTPS with bearer auth.  
[README](mcp-servers/job-tracker-mcp/README.md) · [Source](mcp-servers/job-tracker-mcp/src/server.ts)

## Stack

n8n · OpenAI API · Anthropic API · TypeScript · JavaScript · Docker · Fly.io
