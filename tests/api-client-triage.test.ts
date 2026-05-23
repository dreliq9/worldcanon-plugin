import { ApiClient } from "../src/api-client";

describe("ApiClient — triage", () => {
  let originalFetch: typeof fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("listInbox() GETs and returns items", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { path: "a.md", vault_path: "_inbox/a.md", preview: "x", size: 10 },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.listInbox();
    expect(out.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/inbox",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("triageSuggest() POSTs and returns classification", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        classification: "drafts",
        confidence: "high",
        reasoning: "partial chapter",
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.triageSuggest({ path: "chap1.md" });
    expect(out.classification).toBe("drafts");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/triage-suggest",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
