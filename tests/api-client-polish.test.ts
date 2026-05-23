import { ApiClient } from "../src/api-client";

describe("ApiClient — polish", () => {
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

  test("unlinkedMentions() GETs with file query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ mentions: [] }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    await c.unlinkedMentions({ file: "canon/ch01.md" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/unlinked-mentions?file=canon%2Fch01.md",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("planEntityRename() POSTs with old name in path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        old_name: "Aerin",
        new_name: "Erien",
        entity_file: "entities/characters/Aerin.md",
        new_entity_file: "entities/characters/Erien.md",
        plain_text_rewrites: [],
        alias_updates: [],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.planEntityRename("Aerin", { new_name: "Erien" });
    expect(out.new_entity_file).toContain("Erien");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7777/entity/Aerin/rename",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("timeline() GETs and returns events", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          { kind: "fact", entity: "Aerin", claim: "has green eyes",
            chapter_index: 3, source_file: "entities/characters/Aerin.md" },
        ],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.timeline();
    expect(out.events).toHaveLength(1);
  });
});
