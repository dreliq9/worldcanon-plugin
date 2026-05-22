import { ApiClient, ApiUnavailableError } from "../src/api-client";

describe("ApiClient — LLM endpoints", () => {
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

  test("ask() POSTs JSON body and parses response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "Green.",
        citations: ["canon/ch01.md"],
        hits: [],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.ask({ question: "eyes?" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/ask",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ question: "eyes?" }),
      }),
    );
    expect(out.answer).toBe("Green.");
    expect(out.citations).toEqual(["canon/ch01.md"]);
  });

  test("contradictionCheck() POSTs and parses findings", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        findings: [
          {
            entity: "Aerin",
            new_claim: "blue eyes",
            conflicting_canon: "green eyes",
            reasoning: "color conflict",
          },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.contradictionCheck({ text: "Aerin's blue eyes." });
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0].entity).toBe("Aerin");
  });

  test("ask() throws ApiUnavailableError on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fail"));
    const c = new ApiClient("http://127.0.0.1:7777");
    await expect(c.ask({ question: "q" })).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  test("ask() surfaces 503 with reason for LLMUnavailable", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({ detail: { status: "llm_unavailable", reason: "Ollama down" } }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    await expect(c.ask({ question: "q" })).rejects.toThrow(/llm_unavailable/i);
  });
});
