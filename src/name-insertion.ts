export interface NameToInsert {
  name: string;
  status: "used" | "candidate";
  usedBy?: string;
  notes?: string;
}

const SECTION = /^##\s+/gm;

function renderYamlEntry(entry: NameToInsert): string {
  const lines = [`- name: ${entry.name}`, `  status: ${entry.status}`];
  if (entry.usedBy) lines.push(`  used_by: ${entry.usedBy}`);
  if (entry.notes) lines.push(`  notes: ${entry.notes}`);
  return lines.join("\n");
}

export function insertNameIntoWorkbench(content: string, entry: NameToInsert): string {
  const yaml = renderYamlEntry(entry);

  const headingRe = /^##\s+Names\s*$/m;
  const headingMatch = headingRe.exec(content);

  if (!headingMatch) {
    const trailing = content.endsWith("\n") ? "" : "\n";
    return `${content}${trailing}\n## Names\n\n${yaml}\n`;
  }

  const factsStart = headingMatch.index + headingMatch[0].length;
  SECTION.lastIndex = factsStart + 1;
  const nextSection = SECTION.exec(content);
  const sectionEnd = nextSection ? nextSection.index : content.length;

  const before = content.slice(0, sectionEnd).replace(/\s+$/, "");
  const after = content.slice(sectionEnd);
  const insertion = `\n\n${yaml}\n`;
  const trailingNewlines = after.length > 0 ? "\n" : "\n";
  return `${before}${insertion}${trailingNewlines}${after}`;
}
