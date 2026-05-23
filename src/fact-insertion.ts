export interface FactToInsert {
  claim: string;
  status: "canon" | "draft" | "retconned" | "proposed";
  introduced_in: string;
  chapter_index: number | null;
}

function renderYamlEntry(fact: FactToInsert): string {
  const escapedClaim = fact.claim.replace(/"/g, '\\"');
  const escapedSource = fact.introduced_in.replace(/"/g, '\\"');
  const chapter = fact.chapter_index === null ? "null" : String(fact.chapter_index);
  return [
    `- claim: "${escapedClaim}"`,
    `  status: ${fact.status}`,
    `  introduced_in: "${escapedSource}"`,
    `  chapter_index: ${chapter}`,
  ].join("\n");
}

export function insertFactIntoSheet(content: string, fact: FactToInsert): string {
  const yamlEntry = renderYamlEntry(fact);

  const headingRe = /^##\s+Facts\s*$/m;
  const headingMatch = headingRe.exec(content);

  if (!headingMatch) {
    const trailing = content.endsWith("\n") ? "" : "\n";
    return `${content}${trailing}\n## Facts\n\n${yamlEntry}\n`;
  }

  const factsStart = headingMatch.index + headingMatch[0].length;
  const sectionRe = /^##\s+/gm;
  sectionRe.lastIndex = factsStart + 1;
  const nextSection = sectionRe.exec(content);
  const sectionEnd = nextSection ? nextSection.index : content.length;

  const before = content.slice(0, sectionEnd).replace(/\s+$/, "");
  const after = content.slice(sectionEnd);
  const insertion = `\n\n${yamlEntry}\n`;

  return `${before}${insertion}\n${after}`;
}
