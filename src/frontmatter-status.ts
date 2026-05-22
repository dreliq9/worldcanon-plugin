const FENCE = /^---\s*\n([\s\S]*?\n)---\s*(\n|$)/;

export function updateFrontmatterStatus(content: string, newStatus: string): string {
  const match = FENCE.exec(content);
  if (!match) return content;

  const fmBody = match[1];
  const fmStart = match.index;
  const fmEnd = match.index + match[0].length;

  let updatedFmBody: string;
  if (/^status:\s*.*$/m.test(fmBody)) {
    updatedFmBody = fmBody.replace(/^status:\s*.*$/m, `status: ${newStatus}`);
  } else {
    if (fmBody.trim().length === 0) {
      updatedFmBody = `status: ${newStatus}\n`;
    } else {
      const trailing = fmBody.endsWith("\n") ? "" : "\n";
      updatedFmBody = `${fmBody}${trailing}status: ${newStatus}\n`;
    }
  }

  // Reconstruct: keep everything before the frontmatter, rebuild the fenced
  // block, then keep everything after. The original closing fence may or may
  // not have had a trailing newline; preserve whatever was there.
  const afterClose = content.slice(fmEnd);
  return `${content.slice(0, fmStart)}---\n${updatedFmBody}---\n${afterClose}`;
}
