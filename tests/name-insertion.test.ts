import { insertNameIntoWorkbench } from "../src/name-insertion";

describe("insertNameIntoWorkbench", () => {
  test("appends candidate to existing Names section", () => {
    const before = `---\ntype: naming\nculture: northern\n---\n\n# Northern Naming\n\n## Names\n\n- name: Aerin\n  status: used\n  used_by: entities/characters/Aerin.md\n`;
    const out = insertNameIntoWorkbench(before, {
      name: "Kjeld",
      status: "candidate",
      notes: "warrior vibe",
    });
    expect(out).toContain("- name: Kjeld");
    expect(out).toContain("status: candidate");
    expect(out).toContain("notes: warrior vibe");
    expect(out).toContain("- name: Aerin");
  });

  test("creates Names section if absent", () => {
    const before = `---\ntype: naming\nculture: northern\n---\n\n# Northern Naming\n\nIntro prose.\n`;
    const out = insertNameIntoWorkbench(before, { name: "Bjorn", status: "candidate" });
    expect(out).toContain("## Names");
    expect(out).toContain("- name: Bjorn");
  });

  test("writes used_by line when supplied", () => {
    const before = `# X\n\n## Names\n\n`;
    const out = insertNameIntoWorkbench(before, {
      name: "Aerin",
      status: "used",
      usedBy: "entities/characters/Aerin.md",
    });
    expect(out).toContain("used_by: entities/characters/Aerin.md");
  });

  test("omits used_by and notes when not supplied", () => {
    const before = `# X\n\n## Names\n\n`;
    const out = insertNameIntoWorkbench(before, { name: "Sigrid", status: "candidate" });
    expect(out).toContain("- name: Sigrid");
    expect(out).toContain("status: candidate");
    expect(out).not.toContain("used_by:");
    expect(out).not.toContain("notes:");
  });
});
