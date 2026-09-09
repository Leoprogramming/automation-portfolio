import { timingSafeEqual } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAll } from "./tools.js";

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

function buildServer(): McpServer {
  const mcp = new McpServer({
    name: "job-tracker-mcp",
    version: "0.1.0",
  });
  registerAll(mcp);
  return mcp;
}

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
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.all("/mcp", (_req: Request, res: Response) => {
  res.status(405).set("Allow", "POST").json({ error: "Method Not Allowed" });
});

async function main() {
  app.listen(PORT, "0.0.0.0", () => {
    console.error(`MCP server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
