import { ApiClient } from "../src/api-client";

describe("ApiClient — naming", () => {
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

  test("listCultures() GETs and returns list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cultures: [
          { culture: "northern", used_count: 2, candidate_count: 3 },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.listCultures();
    expect(out.cultures).toHaveLength(1);
    expect(out.cultures[0].culture).toBe("northern");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/name/cultures",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("suggestNames() POSTs and returns suggestions", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { name: "Kjeld", reasoning: "fits the pattern" },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.suggestNames({ culture: "northern", role: "warrior", count: 3 });
    expect(out.suggestions[0].name).toBe("Kjeld");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/name/suggest",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ culture: "northern", role: "warrior", count: 3 }),
      }),
    );
  });
});
