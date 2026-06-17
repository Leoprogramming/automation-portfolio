# Job Tracker MCP Server

A custom [Model Context Protocol](https://modelcontextprotocol.io) server, written in TypeScript, that exposes Project 2's Airtable job tracker as tools Claude can call directly from a conversation.

Point an MCP client at this server and you can say things like *"show me my recent tracked jobs"* and *"mark the Teclead one as Applied"* — the client calls the right tool, with the right validated arguments, and writes back to the same Airtable base the n8n pipeline populates.

## Tools

The server exposes three tools to any MCP client.

| Tool | Direction | What it does |
|------|-----------|--------------|
| `list_recent_jobs(limit?)` | read | Returns a scannable index of recent postings — title, company, score, status, slug, url, tags, match reason. **No description field** — kept deliberately slim. |
| `get_job_by_slug(slug)` | read | Returns the **full** record for one job, including the complete description. Use after `list_recent_jobs` when you want to read a posting in detail. |
| `update_job_status(slug, status)` | **write** | Updates a job's status (`To Review` / `Applied` / `Interview` / `Rejected`). Returns a before/after diff. Status is a strict Zod enum — no free-form text. |

## Architecture

- **Transport:** [StreamableHTTP](https://modelcontextprotocol.io/docs/concepts/transports), stateless mode (`sessionIdGenerator: undefined`). Each POST to `/mcp` creates its own transport instance and closes it on response, so there is no shared session state across requests.
- **Auth:** Bearer token in the `Authorization` header, compared with `crypto.timingSafeEqual` to avoid timing side-channels. Missing or wrong token → `401`.
- **Input validation:** All slug-taking tools share a single `SlugSchema` — a Zod string with a `^[a-z0-9-]+$` regex. Any slug containing a quote, space, or other character that could break the Airtable `filterByFormula` is rejected by the MCP layer *before* any outbound HTTP call.
- **Slug lookup:** Both `get_job_by_slug` and `update_job_status` route through a single `findRecordBySlug` helper that returns a discriminated `LookupResult = { record } | { error }`. The validation + lookup pattern lives in one place.
- **No description in the index:** `list_recent_jobs` strips the description out by design. Job descriptions can be long; pulling 10 of them into a tool result is expensive context-wise. The index is for browsing; `get_job_by_slug` is for reading.
- **Error propagation:** Airtable failures surface as structured MCP error responses with status codes and body text, not silent swallows. The HTTP handler guards against double-write with a `headersSent` check.

## Stack

- TypeScript (strict mode, ESM, NodeNext resolution)
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) v1.29
- Express 5 (HTTP wrapper)
- Zod 4 (input validation)
- [`tsx`](https://github.com/privatenumber/tsx) (dev watch mode)
- Airtable REST API

## Requirements

- **Node.js ≥ 20.6** — the dev script uses `tsx watch --env-file=.env.local`, which relies on Node's built-in `--env-file` flag. Node 20.6 introduced it; earlier versions will fail at startup with `bad option: --env-file`.
- An Airtable base matching the [Project 2 schema](../../workflows/job-tracker-README.md#airtable-schema-19-fields) (this server reads and writes against the same base the n8n pipeline populates).

## How to run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local`:

   | Variable | Where to get it |
   |----------|-----------------|
   | `AIRTABLE_PAT` | [airtable.com/create/tokens](https://airtable.com/create/tokens) — scopes: `data.records:read`, `data.records:write`. Restrict to your job tracker base. |
   | `AIRTABLE_BASE_ID` | First path segment of your Airtable URL (`https://airtable.com/{baseId}/...`) |
   | `AIRTABLE_TABLE_ID` | Second path segment of your Airtable URL |
   | `MCP_BEARER_TOKEN` | Generate one: `openssl rand -hex 32`. Any client calling the server must send `Authorization: Bearer <this>`. |
   | `PORT` | Defaults to `3000` if unset. |

   `.env.local` is gitignored.

3. Start the dev server (watch mode):

   ```bash
   npm run dev
   ```

   You should see:

   ```
   MCP server listening on http://localhost:3000/mcp
   ```

4. Verify it's responding (with the bearer token from `.env.local`):

   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Authorization: Bearer <your-token>" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

   The response lists the three tools above.

For a production-style start (no watch mode):

```bash
npm run build && npm start
```

## Connecting an MCP client

For Claude Code, drop this into `.mcp.json` at the root of any project where you want the tools available (Claude Code looks for `.mcp.json` in the project root — that's a Claude Code convention, not part of the MCP spec):

```json
{
  "mcpServers": {
    "job-tracker": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

`.mcp.json` should be gitignored — it holds the bearer token in plaintext. A `.mcp.json.example` template lives at the repo root.

Reload Claude Code (`Cmd/Ctrl+Shift+P` → "Developer: Reload Window") and run `/mcp` to confirm the server is connected and the three tools are listed.

## Project layout

```
mcp-servers/job-tracker-mcp/
├── src/
│   └── server.ts        # All three tools + Express wrapper, ~300 lines
├── .env.example         # Template — copy to .env.local
├── package.json
├── tsconfig.json
└── README.md
```

The full implementation is a single file by design — at this size, splitting into modules would obscure more than it clarifies.
