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

const LIST_FIELDS = new Set([
  "title",
  "company",
  "score",
  "status",
  "slug",
  "url",
  "match reason",
  "tags",
]);

mcp.registerTool(
  "list_recent_jobs",
  {
    description:
      "List a scannable index of job postings from the Airtable job tracker. Returns title, company, score, status, slug, url, tags, and match reason only — no full descriptions. Use this to browse, count, or filter jobs. To read a full job description, use get_job_by_slug.",
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
          .filter(([k]) => LIST_FIELDS.has(k))
          .map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
          .join("\n");
        return `- slug=${r.fields["slug"] ?? r.id}\n${fieldLines}`;
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

mcp.registerTool(
  "update_job_status",
  {
    description:
      "Update the status of a job in the Airtable tracker. Use this when the user says they've applied to a job, got an interview, or wants to change a job's status. Requires the job's slug (visible in list_recent_jobs output). Returns a before/after diff so the user can confirm the change.",
    inputSchema: {
      slug: z
        .string()
        .min(1)
        .describe(
          "The job's slug identifier, e.g. 'senior-crm-marketing-managerin-berlin-467202'. Get it from list_recent_jobs.",
        ),
      status: z
        .enum(["To Review", "Applied", "Interview", "Rejected"])
        .describe("The new status to set on the job."),
    },
  },
  async ({ slug, status }) => {
    // Find the record by slug
    const searchUrl = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
    );
    searchUrl.searchParams.set("filterByFormula", `{slug}="${slug}"`);
    searchUrl.searchParams.set("maxRecords", "1");

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });

    if (!searchResponse.ok) {
      const body = await searchResponse.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Airtable lookup failed ${searchResponse.status}: ${body}`,
          },
        ],
      };
    }

    const searchData = (await searchResponse.json()) as {
      records: AirtableRecord[];
    };

    if (searchData.records.length === 0) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No job found with slug "${slug}". Use list_recent_jobs to check available slugs.`,
          },
        ],
      };
    }

    const record = searchData.records[0];
    const currentStatus = record.fields["status"] as string | undefined;

    if (currentStatus === status) {
      return {
        content: [
          {
            type: "text",
            text: `No change: "${slug}" is already "${status}".`,
          },
        ],
      };
    }

    // Update the record
    const patchResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${record.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { status } }),
      },
    );

    if (!patchResponse.ok) {
      const body = await patchResponse.text();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Airtable PATCH failed ${patchResponse.status}: ${body}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated "${slug}":\n  status: "${currentStatus ?? "unknown"}" → "${status}"`,
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
