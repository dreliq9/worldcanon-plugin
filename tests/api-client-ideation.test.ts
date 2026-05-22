import { ApiClient } from "../src/api-client";

describe("ApiClient — ideation + fact proposal", () => {
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

  test("startIdeation() POSTs and returns session", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ session_id: "abc", first_question: "what?" }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.startIdeation({ entity: "Aerin" });
    expect(out.session_id).toBe("abc");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/ideation/start",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("respondToIdeation() POSTs with session id in path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        proposed_facts: [{ claim: "x", confidence: "high" }],
        next_question: "next?",
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.respondToIdeation("abc", { answer: "yes" });
    expect(out.next_question).toBe("next?");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/ideation/abc/respond",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("proposeFacts() POSTs and returns facts", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        proposed_facts: [
          { entity: "Aerin", claim: "green eyes", confidence: "high" },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.proposeFacts({ text: "Aerin had green eyes.", source: "x" });
    expect(out.proposed_facts).toHaveLength(1);
    expect(out.proposed_facts[0].entity).toBe("Aerin");
  });
});
