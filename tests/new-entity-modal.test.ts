import { buildEntitySheetContent, entityFolderForType } from "../src/new-entity-modal";

describe("entity sheet scaffolding", () => {
  test("buildEntitySheetContent emits frontmatter with type and name", () => {
    const out = buildEntitySheetContent({ type: "character", name: "Aerin" });
    expect(out).toMatch(/^---\n/);
    expect(out).toMatch(/type: character/);
    expect(out).toMatch(/name: Aerin/);
    expect(out).toMatch(/## Facts/);
    expect(out).toMatch(/## Relationships/);
  });

  test("buildEntitySheetContent does not include a Relationships section for events", () => {
    const out = buildEntitySheetContent({ type: "event", name: "Battle of Stormholm" });
    expect(out).toMatch(/type: event/);
    expect(out).not.toMatch(/## Relationships/);
  });

  test("entityFolderForType returns the right subfolder", () => {
    expect(entityFolderForType("character")).toBe("entities/characters");
    expect(entityFolderForType("place")).toBe("entities/places");
    expect(entityFolderForType("faction")).toBe("entities/factions");
    expect(entityFolderForType("item")).toBe("entities/items");
    expect(entityFolderForType("event")).toBe("entities/events");
  });
});
