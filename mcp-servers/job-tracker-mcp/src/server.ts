import { timingSafeEqual } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PORT = Number(process.env.PORT ?? 3000);
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.error("FATAL: MCP_BEARER_TOKEN env var is required");
  process.exit(1);
}

const expectedAuth = Buffer.from(`Bearer ${BEARER_TOKEN}`);

const mcp = new McpServer({
  name: "job-tracker-mcp",
  version: "0.1.0",
});

mcp.tool(
  "ping",
  "Health check. Returns pong with a server timestamp.",
  async () => ({
    content: [{ type: "text", text: `pong @ ${new Date().toISOString()}` }],
  }),
);

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

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
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

async function main() {
  await mcp.connect(transport);
  app.listen(PORT, () => {
    console.error(`MCP server listening on http://localhost:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
