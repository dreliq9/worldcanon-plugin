import { updateFrontmatterStatus } from "../src/frontmatter-status";

describe("updateFrontmatterStatus", () => {
  test("flips existing status line", () => {
    const before = `---\ntype: brainstorm\nstatus: unprocessed\ndate: 2026-05-22\n---\n\nbody.\n`;
    const out = updateFrontmatterStatus(before, "processed");
    expect(out).toContain("status: processed");
    expect(out).not.toContain("status: unprocessed");
    expect(out).toContain("type: brainstorm");
    expect(out).toContain("body.");
  });

  test("inserts status field when absent (frontmatter exists)", () => {
    const before = `---\ntype: brainstorm\ndate: 2026-05-22\n---\n\nbody.\n`;
    const out = updateFrontmatterStatus(before, "processed");
    expect(out).toMatch(/status: processed/);
  });

  test("returns input unchanged when no frontmatter", () => {
    const before = `no frontmatter here.\n`;
    const out = updateFrontmatterStatus(before, "processed");
    expect(out).toBe(before);
  });

  test("preserves indentation and other YAML fields", () => {
    const before = `---\ntype: brainstorm\nstatus: unprocessed\nentities_mentioned: [Aerin]\ntopics:\n  - weapon\n---\n\nbody.\n`;
    const out = updateFrontmatterStatus(before, "processed");
    expect(out).toContain("entities_mentioned: [Aerin]");
    expect(out).toContain("topics:\n  - weapon");
    expect(out).toContain("status: processed");
  });
});
