import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
  "scraped at",
]);

export const SlugSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, digits, and hyphens.",
  )
  .describe(
    "The job's slug identifier, e.g. 'senior-crm-marketing-managerin-berlin-467202'. Get it from list_recent_jobs.",
  );

type LookupResult = { record: AirtableRecord } | { error: string };

function airtableEnv() {
  return {
    pat: process.env.AIRTABLE_PAT as string,
    baseId: process.env.AIRTABLE_BASE_ID as string,
    tableId: process.env.AIRTABLE_TABLE_ID as string,
  };
}

// Caller must have already validated slug against SlugSchema; no further escaping is needed.
export async function findRecordBySlug(slug: string): Promise<LookupResult> {
  const { pat, baseId, tableId } = airtableEnv();
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set("filterByFormula", `{slug}="${slug}"`);
  url.searchParams.set("maxRecords", "1");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${pat}` },
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      error: `Airtable returned ${response.status} ${response.statusText}: ${body}`,
    };
  }

  const data = (await response.json()) as { records: AirtableRecord[] };

  if (data.records.length === 0) {
    return {
      error: `No job found with slug "${slug}". Use list_recent_jobs to check available slugs.`,
    };
  }

  return { record: data.records[0] };
}

export const listRecentJobs = {
  name: "list_recent_jobs",
  config: {
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
  handler: async ({ limit }: { limit: number }) => {
    const { pat, baseId, tableId } = airtableEnv();
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set("maxRecords", String(limit));
    url.searchParams.set("sort[0][field]", "scraped at");
    url.searchParams.set("sort[0][direction]", "desc");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
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
          type: "text" as const,
          text: `Returned ${data.records.length} record(s):\n\n${summary}`,
        },
      ],
    };
  },
};

export const getJobBySlug = {
  name: "get_job_by_slug",
  config: {
    description:
      "Fetch the full details of a single job posting by its slug, including the complete job description. Use this after list_recent_jobs to read the full posting before deciding to apply or update status.",
    inputSchema: {
      slug: SlugSchema,
    },
  },
  handler: async ({ slug }: { slug: string }) => {
    const lookup = await findRecordBySlug(slug);

    if ("error" in lookup) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: lookup.error }],
      };
    }

    const { record } = lookup;
    const fieldLines = Object.entries(record.fields)
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Job record for "${slug}":\n${fieldLines}`,
        },
      ],
    };
  },
};

export const updateJobStatus = {
  name: "update_job_status",
  config: {
    description:
      "Update the status of a job in the Airtable tracker. Use this when the user says they've applied to a job, got an interview, or wants to change a job's status. Requires the job's slug (visible in list_recent_jobs output). Returns a before/after diff so the user can confirm the change.",
    inputSchema: {
      slug: SlugSchema,
      status: z
        .enum(["To Review", "Applied", "Interview", "Rejected"])
        .describe("The new status to set on the job."),
    },
  },
  handler: async ({
    slug,
    status,
  }: {
    slug: string;
    status: "To Review" | "Applied" | "Interview" | "Rejected";
  }) => {
    const { pat, baseId, tableId } = airtableEnv();
    const lookup = await findRecordBySlug(slug);

    if ("error" in lookup) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: lookup.error }],
      };
    }

    const { record } = lookup;
    const currentStatus = record.fields["status"] as string | undefined;

    if (currentStatus === status) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No change: "${slug}" is already "${status}".`,
          },
        ],
      };
    }

    const patchResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${record.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${pat}`,
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
            type: "text" as const,
            text: `Airtable PATCH failed ${patchResponse.status}: ${body}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Updated "${slug}":\n  status: "${currentStatus ?? "unknown"}" → "${status}"`,
        },
      ],
    };
  },
};

export function registerAll(mcp: McpServer) {
  mcp.registerTool(
    listRecentJobs.name,
    listRecentJobs.config,
    listRecentJobs.handler,
  );
  mcp.registerTool(
    getJobBySlug.name,
    getJobBySlug.config,
    getJobBySlug.handler,
  );
  mcp.registerTool(
    updateJobStatus.name,
    updateJobStatus.config,
    updateJobStatus.handler,
  );
}
