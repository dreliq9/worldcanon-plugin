import { ItemView, MarkdownView, TFile, WorkspaceLeaf, type EventRef } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { EntityResponse } from "./types";

export const CANON_VIEW_TYPE = "worldcanon-canon-view";

const WIKILINK = /\[\[([^\]|#]+?)(?:\|[^\]]+)?(?:#[^\]]+)?\]\]/g;

export class CanonView extends ItemView {
  private currentNote: TFile | null = null;

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
    this.registerEvent(vault.on("modify", () => void this.refresh()) as unknown as EventRef);
    await this.refresh();
  }

  async onClose(): Promise<void> {
    /* nothing to clean up */
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
}

export function extractWikilinks(text: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = WIKILINK.exec(text)) !== null) {
    out.add(m[1].trim());
  }
  return Array.from(out).sort();
}
