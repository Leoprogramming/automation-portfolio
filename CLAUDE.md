# Project Context for Claude Code

## What this repo is

AI Automation Engineer portfolio. I'm rebuilding into the field after a 3-year coding hiatus. Targeting Junior AI Automation Engineer roles in Berlin.

## My background

- Full-stack dev 2020-2022 (front-end leaning), JavaScript/TypeScript/React/Next.js/Node
- 3-year hiatus from production code
- Currently doing C1 German, working part-time non-tech
- Bootcamp grad (Le Wagon, IronHack), no CS degree
- Project Management experience at Tiba (BIRT, Planisware)

## Stack for this portfolio

- n8n (self-hosted via Docker) as primary automation tool
- LLM APIs: OpenAI and Anthropic
- MCP servers (Anthropic's Model Context Protocol)
- TypeScript / Node.js for custom logic
- Light Python where needed
- Next.js for small dashboards (later)

## How I want you to work with me

- Explain code line-by-line when I ask, don't just generate
- I need to understand every line I commit — don't write code I can't explain
- For weeks 1-2 (n8n fundamentals), be a tutor more than a generator
- Always show me the diff before changing files
- Suggest edge cases and failure modes after writing code
- Be direct, push back if I'm doing something wrong, don't be sycophantic

## What I'm building toward

- Project 1 (weeks 3-5): End-to-end business automation with n8n + LLM, deployed, with measurable ROI story
- Project 2 (weeks 6-7): Custom MCP server exposing a real tool to Claude
- Project 3 (week 8, optional): Next.js dashboard over Project 1
- Applying to jobs late June / early July 2026

## Important

- I have a separate Claude conversation that holds the long-term plan and strategy
- You handle code execution, file editing, debugging
- I'll bring strategic decisions to the other conversation

## Public-artifact voice — hard rule

Everything committed to this repo is public and must read as working
developer output, not portfolio output. The repo must look like tools I
built because I use them, not artifacts built to be evaluated.

- **Never** reference recruiters, interviewers, hiring, "portfolio,"
  "showcase," or what something "demonstrates / proves / highlights."
- **No resume voice** anywhere in the repo: commit messages, code
  comments, READMEs, LEARNING.md, file/folder/branch names, TODOs, PR titles.
- Code comments explain the engineering ("surface Airtable failures
  instead of swallowing them"), never the intent to impress ("added
  error handling to show production thinking").
- LEARNING.md reflects on the engineering, not the audience. "Per-request
  transport fixed the 500" is fine. "This will look good to employers" is not.

**The test before writing any line into the repo:** would a developer at
a company write this exact line in a private internal repo nobody grades?
If no, rewrite it.

Strategy framing (job hunt, target roles, why this matters for applications)
lives ONLY in gitignored planning docs (PLANNING-CONTEXT.md) and the
planning chat. It never enters a tracked file.
