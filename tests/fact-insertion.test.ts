import { insertFactIntoSheet } from "../src/fact-insertion";

describe("insertFactIntoSheet", () => {
  test("appends fact to existing Facts section", () => {
    const before = `---\ntype: character\nname: Aerin\n---\n\n# Aerin\n\nbody.\n\n## Facts\n\n- claim: "has green eyes"\n  status: canon\n  introduced_in: x\n  chapter_index: null\n\n## Relationships\n\n- with: Lira\n  type: sister\n  status: canon\n`;
    const out = insertFactIntoSheet(before, {
      claim: "carries a dagger",
      status: "draft",
      introduced_in: "ideation/abc",
      chapter_index: null,
    });
    const firstIdx = out.indexOf('claim: "has green eyes"');
    const secondIdx = out.indexOf('claim: "carries a dagger"');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(out.indexOf("## Relationships")).toBeGreaterThan(secondIdx);
  });

  test("creates Facts section if absent", () => {
    const before = `---\ntype: character\nname: Aerin\n---\n\n# Aerin\n\nbody.\n`;
    const out = insertFactIntoSheet(before, {
      claim: "has green eyes",
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
    });
    expect(out).toContain("## Facts");
    expect(out).toContain('claim: "has green eyes"');
  });

  test("appends to Facts section that ends file (no trailing section)", () => {
    const before = `---\ntype: character\nname: Aerin\n---\n\n# Aerin\n\nbody.\n\n## Facts\n\n- claim: "first"\n  status: canon\n  introduced_in: x\n  chapter_index: null\n`;
    const out = insertFactIntoSheet(before, {
      claim: "second",
      status: "draft",
      introduced_in: "x",
      chapter_index: null,
    });
    expect(out).toContain('claim: "first"');
    expect(out).toContain('claim: "second"');
    expect(out.indexOf('claim: "first"')).toBeLessThan(out.indexOf('claim: "second"'));
  });

  test("escapes double-quotes in claim text", () => {
    const before = `# X\n\n## Facts\n\n`;
    const out = insertFactIntoSheet(before, {
      claim: 'has a "secret" name',
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
    });
    expect(out).toContain('claim: "has a \\"secret\\" name"');
  });

  test("renders chapter_index null without quotes", () => {
    const before = `# X\n\n## Facts\n\n`;
    const out = insertFactIntoSheet(before, {
      claim: "x",
      status: "canon",
      introduced_in: "y",
      chapter_index: null,
    });
    expect(out).toContain("chapter_index: null");
  });

  test("section regex state does not leak across calls", () => {
    const noHeading = `# X\n\nbody.\n`;
    insertFactIntoSheet(noHeading, {
      claim: "first",
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
    });
    const withHeading = `# X\n\n## Facts\n\n- claim: "existing"\n  status: canon\n  introduced_in: x\n  chapter_index: null\n\n## Other\n\nfoo\n`;
    const out = insertFactIntoSheet(withHeading, {
      claim: "second",
      status: "canon",
      introduced_in: "x",
      chapter_index: null,
    });
    expect(out.indexOf('claim: "second"')).toBeLessThan(out.indexOf("## Other"));
    expect(out.indexOf('claim: "existing"')).toBeLessThan(out.indexOf('claim: "second"'));
  });

  test("renders chapter_index integer without quotes", () => {
    const before = `# X\n\n## Facts\n\n`;
    const out = insertFactIntoSheet(before, {
      claim: "x",
      status: "canon",
      introduced_in: "y",
      chapter_index: 3,
    });
    expect(out).toContain("chapter_index: 3");
  });
});
