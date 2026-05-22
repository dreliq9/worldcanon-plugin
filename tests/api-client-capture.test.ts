import { ApiClient } from "../src/api-client";

describe("ApiClient — capture", () => {
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

  test("capture() POSTs and returns path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", path: "brainstorm/2026-05-22-1430.md" }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.capture({ text: "thought", source: "obsidian" });
    expect(out.path).toBe("brainstorm/2026-05-22-1430.md");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/capture",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "thought", source: "obsidian" }),
      }),
    );
  });

  test("unprocessedBrainstorm() GETs and returns notes", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        notes: [
          { source_path: "brainstorm/2026-05-22-1430.md", preview: "x", date: null, mtime: 1 },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.unprocessedBrainstorm();
    expect(out.notes).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/unprocessed-brainstorm",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
