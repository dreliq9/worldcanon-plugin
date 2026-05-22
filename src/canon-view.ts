import { ItemView, MarkdownView, TFile, WorkspaceLeaf, type EventRef } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { EntityResponse } from "./types";

export const CANON_VIEW_TYPE = "worldcanon-canon-view";

const WIKILINK = /\[\[([^\]|#]+?)(?:\|[^\]]+)?(?:#[^\]]+)?\]\]/g;

export class CanonView extends ItemView {
  private currentNote: TFile | null = null;
  private contradictionTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, private api: ApiClient) {
    super(leaf);
  }

  getViewType(): string {
    return CANON_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Canon";
  }

  getIcon(): string {
    return "book-open";
  }

  async onOpen(): Promise<void> {
    (this.contentEl as { addClass(c: string): void }).addClass("worldcanon-canon-view");
    const workspace = (this.app as unknown as { workspace: { on(ev: string, cb: () => void): unknown } }).workspace;
    const vault = (this.app as unknown as { vault: { on(ev: string, cb: () => void): unknown } }).vault;
    this.registerEvent(workspace.on("active-leaf-change", () => void this.refresh()) as unknown as EventRef);
    this.registerEvent(vault.on("modify", () => {
      void this.refresh();
      this.scheduleContradictionCheck();
    }) as unknown as EventRef);
    await this.refresh();
  }

  async onClose(): Promise<void> {
    if (this.contradictionTimer !== null) {
      window.clearTimeout(this.contradictionTimer);
    }
  }

  setApiClient(api: ApiClient): void {
    this.api = api;
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const workspace = (this.app as { workspace: { getActiveViewOfType<T>(t: unknown): T | null } }).workspace;
    const vault = (this.app as { vault: { cachedRead(f: TFile): Promise<string> } }).vault;

    const active = workspace.getActiveViewOfType<{ file: TFile | null }>(MarkdownView);
    const file = active?.file ?? null;
    this.currentNote = file;
    this.renderShell(file);

    if (!file) return;

    const text = await vault.cachedRead(file);
    const names = extractWikilinks(text);

    if (names.length === 0) {
      (this.contentEl as { createDiv(o: { cls: string }): { setText(t: string): void } })
        .createDiv({ cls: "worldcanon-empty" })
        .setText("No [[wikilinks]] in this note yet.");
      return;
    }

    for (const name of names) {
      const section = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-entity" });
      const header = (section as { createEl(t: string): { setText(s: string): void } }).createEl("h3");
      header.setText(name);

      try {
        const entity = await this.api.entity(name);
        this.renderEntity(section, entity);
      } catch (err) {
        const msg = (section as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
          .createEl("div", { cls: "worldcanon-error" });
        if (err instanceof ApiUnavailableError) {
          msg.setText("(sidecar unreachable)");
        } else if (/not found/i.test((err as Error).message)) {
          msg.setText("(no sheet yet — use Canon: New entity to create one)");
        } else {
          msg.setText(`(error: ${(err as Error).message})`);
        }
      }
    }
  }

  private renderShell(file: TFile | null): void {
    (this.contentEl as { empty(): void }).empty();
    const title = (this.contentEl as { createEl(t: string): { setText(s: string): void } }).createEl("h2");
    title.setText(file ? `Canon · ${file.basename}` : "Canon");
    if (!file) {
      (this.contentEl as { createDiv(o: { cls: string }): { setText(t: string): void } })
        .createDiv({ cls: "worldcanon-empty" })
        .setText("Open a note to see canon for the entities it references.");
    }
  }

  private renderEntity(parent: HTMLElement, entity: EntityResponse): void {
    if (entity.facts.length === 0) {
      (parent as unknown as { createDiv(o: { cls: string }): { setText(t: string): void } })
        .createDiv({ cls: "worldcanon-empty" }).setText("(no facts recorded)");
      return;
    }
    const list = (parent as unknown as { createEl(t: string, o: { cls: string }): HTMLElement })
      .createEl("ul", { cls: "worldcanon-fact-list" });
    for (const fact of entity.facts) {
      const li = (list as unknown as { createEl(t: string): HTMLElement }).createEl("li");
      (li as { addClass(c: string): void }).addClass(`worldcanon-fact-${fact.status}`);
      const status = (li as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("span", { cls: "worldcanon-fact-status" });
      status.setText(`[${fact.status}]`);
      (li as { appendText(s: string): void }).appendText(" ");
      (li as { appendText(s: string): void }).appendText(fact.claim);
    }
  }

  private scheduleContradictionCheck(): void {
    if (this.contradictionTimer !== null) {
      window.clearTimeout(this.contradictionTimer);
    }
    this.contradictionTimer = window.setTimeout(() => void this.runContradictionCheck(), 2000);
  }

  private async runContradictionCheck(): Promise<void> {
    const file = this.currentNote;
    if (!file) return;
    if (!file.path.startsWith("drafts/") && !file.path.startsWith("canon/")) return;
    const vault = (this.app as { vault: { cachedRead(f: TFile): Promise<string> } }).vault;
    const text = await vault.cachedRead(file);
    let findings: { entity: string; new_claim: string; conflicting_canon: string; reasoning: string }[];
    try {
      const out = await this.api.contradictionCheck({ text });
      findings = out.findings;
    } catch (err) {
      // Silent failure — contradictions are polish, don't disrupt the writer.
      return;
    }
    this.renderContradictions(findings);
  }

  private renderContradictions(findings: { entity: string; new_claim: string; conflicting_canon: string; reasoning: string }[]): void {
    const existing = (this.contentEl as HTMLElement).querySelector(".worldcanon-contradictions");
    if (existing) existing.remove();
    if (findings.length === 0) return;

    const section = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-contradictions" });
    const header = (section as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
      .createEl("h3", { cls: "worldcanon-contradictions-header" });
    header.setText(`⚠ Possible contradictions (${findings.length})`);
    for (const f of findings) {
      const card = (section as { createDiv(o: { cls: string }): HTMLElement }).createDiv({ cls: "worldcanon-contradiction-card" });
      const head = (card as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("div", { cls: "worldcanon-contradiction-entity" });
      head.setText(f.entity);
      const newClaim = (card as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("div", { cls: "worldcanon-contradiction-new" });
      newClaim.setText(`New: ${f.new_claim}`);
      const canonEl = (card as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("div", { cls: "worldcanon-contradiction-canon" });
      canonEl.setText(`Canon: ${f.conflicting_canon}`);
      const why = (card as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("div", { cls: "worldcanon-contradiction-reason" });
      why.setText(f.reasoning);
    }
  }
}

export function extractWikilinks(text: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = WIKILINK.exec(text)) !== null) {
    out.add(m[1].trim());
  }
  return Array.from(out).sort();
}
