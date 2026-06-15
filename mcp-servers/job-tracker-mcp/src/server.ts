import { timingSafeEqual } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PORT = Number(process.env.PORT ?? 3000);
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN;
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

if (!BEARER_TOKEN) {
  console.error("FATAL: MCP_BEARER_TOKEN env var is required");
  process.exit(1);
}
if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
  console.error(
    "FATAL: AIRTABLE_PAT, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_ID env vars are required",
  );
  process.exit(1);
}

const expectedAuth = Buffer.from(`Bearer ${BEARER_TOKEN}`);

const mcp = new McpServer({
  name: "job-tracker-mcp",
  version: "0.1.0",
});

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

mcp.registerTool(
  "list_recent_jobs",
  {
    description:
      "List job postings from the Airtable job tracker, newest first by Airtable's record creation order. Use this when the user asks about recent jobs, the latest applications, or wants to see what's been added to the tracker.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of jobs to return (1-100). Defaults to 10."),
    },
  },
  async ({ limit }) => {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
    );
    url.searchParams.set("pageSize", String(limit));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Airtable returned ${response.status} ${response.statusText}: ${body}`,
          },
        ],
      };
    }

    const data = (await response.json()) as { records: AirtableRecord[] };

    const summary = data.records
      .map((r) => {
        const fieldLines = Object.entries(r.fields)
          .map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
          .join("\n");
        return `- id=${r.id} (created ${r.createdTime})\n${fieldLines}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Returned ${data.records.length} record(s):\n\n${summary}`,
        },
      ],
    };
  },
);

const app = express();
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const provided = Buffer.from(header);
  if (
    provided.length !== expectedAuth.length ||
    !timingSafeEqual(provided, expectedAuth)
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  try {
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

async function main() {
  app.listen(PORT, () => {
    console.error(`MCP server listening on http://localhost:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
