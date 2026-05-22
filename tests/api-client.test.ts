import { ApiClient, ApiUnavailableError } from "../src/api-client";

describe("ApiClient", () => {
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

  test("stats() calls /stats and returns parsed body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        corpora: [{ name: "entities", chunk_count: 3, last_indexed: 1, chunker: "entity_sheet" }],
        fact_count: 5,
        relationship_count: 2,
        rule_count: 0,
        name_count: 1,
        embedder: "hash-32"
      })
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const s = await c.stats();
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:7777/stats", expect.any(Object));
    expect(s.fact_count).toBe(5);
    expect(s.corpora[0].name).toBe("entities");
  });

  test("search() encodes query params", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const c = new ApiClient("http://127.0.0.1:7777");
    await c.search({ q: "green eyes", corpus: ["canon", "drafts"], limit: 5 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/search?q=green+eyes&corpus=canon%2Cdrafts&limit=5",
      expect.any(Object)
    );
  });

  test("entity() throws on 404", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    const c = new ApiClient("http://127.0.0.1:7777");
    await expect(c.entity("Nonexistent")).rejects.toThrow(/not found/i);
  });

  test("any method throws ApiUnavailableError on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const c = new ApiClient("http://127.0.0.1:7777");
    await expect(c.stats()).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  test("trims trailing slash from base URL", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ corpora: [], fact_count: 0, relationship_count: 0, rule_count: 0, name_count: 0, embedder: "" }) });
    const c = new ApiClient("http://127.0.0.1:7777/");
    await c.stats();
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:7777/stats", expect.any(Object));
  });

  test("ping() returns true on ok, false on network failure", async () => {
    const c = new ApiClient("http://127.0.0.1:7777");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await c.ping()).toBe(true);
    fetchMock.mockRejectedValueOnce(new TypeError("net"));
    expect(await c.ping()).toBe(false);
  });
});
