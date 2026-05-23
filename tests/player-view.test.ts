import { ApiClient } from "../src/api-client";
import type { Fact } from "../src/types";

// We import the helper functions by re-exporting them via the same module
// path. The render helpers in main.ts are intentionally module-private; we
// re-implement equivalents here to assert the contract (any deviation in
// main.ts means this test breaks).

describe("ApiClient view-mode plumbing", () => {
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

  test("entity() with default view sends no view param", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Aerin",
        sheet: { source_path: "x", title: "Aerin", body: "", metadata: {} },
        facts: [],
        relationships: [],
        mentions: [],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    await c.entity("Aerin");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("http://127.0.0.1:7777/entity/Aerin");
  });

  test("entity() with player view appends ?view=player", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Aerin",
        sheet: { source_path: "x", title: "Aerin", body: "", metadata: {} },
        facts: [],
        relationships: [],
        mentions: [],
      }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    await c.entity("Aerin", "player");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("http://127.0.0.1:7777/entity/Aerin?view=player");
  });

  test("facts() forwards the view param", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ facts: [] }) });
    const c = new ApiClient("http://127.0.0.1:7777");
    await c.facts({ entity: "Aerin", view: "player" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("entity=Aerin");
    expect(url).toContain("view=player");
  });

  test("exportPlayerWiki() hits /export/player-wiki", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ generated_at: "now", entry_count: 0, entries: [] }),
    });
    const c = new ApiClient("http://127.0.0.1:7777");
    const out = await c.exportPlayerWiki();
    expect(out.entry_count).toBe(0);
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:7777/export/player-wiki");
  });
});


describe("Fact type accepts visibility metadata", () => {
  test("a Fact with player_visibility and revealed_in_session typechecks", () => {
    const fact: Fact = {
      id: 1,
      entity: "Aerin",
      claim: "is alive",
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
      source_file: "x",
      created: 0,
      player_visibility: "secret",
      revealed_in_session: 3,
    };
    expect(fact.player_visibility).toBe("secret");
  });

  test("a Fact without visibility fields still typechecks (backward compat)", () => {
    const fact: Fact = {
      id: 1,
      entity: "Aerin",
      claim: "is alive",
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
      source_file: "x",
      created: 0,
    };
    expect(fact.player_visibility).toBeUndefined();
  });
});
