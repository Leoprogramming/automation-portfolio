import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJobBySlug, listRecentJobs } from "./tools.js";

beforeEach(() => {
  vi.stubEnv("AIRTABLE_PAT", "test-pat");
  vi.stubEnv("AIRTABLE_BASE_ID", "app_test");
  vi.stubEnv("AIRTABLE_TABLE_ID", "tbl_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getJobBySlug.handler", () => {
  it("returns formatted job text when a record is found", async () => {
    const record = {
      id: "rec_1",
      createdTime: "2026-09-01T00:00:00.000Z",
      fields: {
        slug: "senior-crm-manager-berlin-123",
        title: "Senior CRM Manager",
        company: "ExampleCo",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ records: [record] }), { status: 200 }),
      ),
    );

    const result = await getJobBySlug.handler({
      slug: "senior-crm-manager-berlin-123",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("senior-crm-manager-berlin-123");
    expect(result.content[0].text).toContain("Senior CRM Manager");
  });

  it("returns isError when slug is not found, with a list_recent_jobs hint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ records: [] }), { status: 200 }),
      ),
    );

    const result = await getJobBySlug.handler({ slug: "does-not-exist" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("does-not-exist");
    expect(result.content[0].text).toContain("list_recent_jobs");
  });
});

describe("listRecentJobs.handler", () => {
  it("surfaces Airtable 500 as isError and requests the correct sort + maxRecords", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listRecentJobs.handler({ limit: 7 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("500");

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("maxRecords")).toBe("7");
    expect(calledUrl.searchParams.get("sort[0][field]")).toBe("scraped at");
  });
});
