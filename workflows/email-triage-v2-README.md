# Email Triage System v2

An n8n automation that monitors a Gmail inbox, classifies incoming emails using OpenAI, logs every email to Google Sheets, and labels high-urgency emails in Gmail automatically.

## What it does

1. **Gmail Trigger** — polls inbox every minute for new emails
2. **OpenAI Classification** — sends subject, sender, and snippet to gpt-4o-mini, returns structured JSON with urgency, category, summary, and suggested action
3. **JSON Parser** — validates and parses the OpenAI response, throws descriptive errors if the response is malformed
4. **Google Sheets Logger** — appends every processed email to a log sheet with timestamp
5. **If Router** — splits flow by urgency: high vs everything else
6. **Gmail Labeler** — adds IMPORTANT label to high-urgency emails automatically

## Architecture

Gmail Trigger
→ OpenAI (gpt-4o-mini, structured JSON output)
→ Code node (JSON parse + validation)
→ Google Sheets (log every email)
→ If (urgency === "high")
→ true: Gmail add label IMPORTANT
→ false: no-op

## What improved over v1 (Zapier)

| Problem in v1                                        | Solution in v2                                               |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Regex JSON parsing — brittle and broke on edge cases | OpenAI structured output with explicit JSON schema in prompt |
| Hardcoded API keys in workflow config                | n8n credential manager — keys never appear in code           |
| No error handling — silent failures                  | try/catch in Code node + dedicated error-handler workflow    |
| No logging — no way to audit what ran                | Google Sheets log with timestamp, sender, urgency, category  |
| Broken template variables in email responses         | Removed until properly implemented                           |

## Stack

- n8n (self-hosted via Docker)
- OpenAI API — gpt-4o-mini
- Gmail API (OAuth2)
- Google Sheets API (OAuth2)

## How to run

1. Import `email-triage-v2.json` into your n8n instance
2. Import `error-handler.json` and link it in email-triage-v2 settings → Error Workflow
3. Set up credentials: OpenAI API key, Gmail OAuth2, Google Sheets OAuth2
4. Create a Google Sheet with headers: `timestamp`, `from`, `subject`, `urgency`, `category`, `summary`
5. Update the Sheets node URL to point to your sheet
6. Publish the workflow
