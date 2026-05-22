import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import { renderFactCard } from "./fact-card";
import { entityFolderForType } from "./new-entity-modal";
import { insertFactIntoSheet } from "./fact-insertion";
import type { EntityProposedFact, EntityType } from "./types";

export const FACT_PROPOSAL_VIEW_TYPE = "worldcanon-fact-proposal-view";

export class FactProposalView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private api: ApiClient) {
    super(leaf);
  }

  getViewType(): string {
    return FACT_PROPOSAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Canon Fact Proposal";
  }

  getIcon(): string {
    return "list-checks";
  }

  setApiClient(api: ApiClient): void {
    this.api = api;
  }

  async onOpen(): Promise<void> {
    (this.contentEl as { addClass(c: string): void }).addClass("worldcanon-proposal-view");
    this.renderInitial();
  }

  async onClose(): Promise<void> {}

  async processActiveNote(): Promise<void> {
    const workspace = (this.app as { workspace: { getActiveViewOfType<T>(t: unknown): T | null } }).workspace;
    const active = workspace.getActiveViewOfType<{ file: TFile | null }>(MarkdownView);
    const file = active?.file ?? null;
    if (!file) {
      new Notice("Open a note first.");
      return;
    }
    const vault = (this.app as { vault: { read(f: TFile): Promise<string> } }).vault;
    const text = await vault.read(file);
    await this.run(file.path, text);
  }

  async processSelection(): Promise<void> {
    const workspace = (this.app as { workspace: { getActiveViewOfType<T>(t: unknown): T | null } }).workspace;
    const active = workspace.getActiveViewOfType<{ file: TFile | null; editor: { getSelection(): string } }>(MarkdownView);
    const file = active?.file ?? null;
    if (!active || !file) {
      new Notice("Open a note first.");
      return;
    }
    const text = active.editor.getSelection();
    if (!text.trim()) {
      new Notice("Select some text first.");
      return;
    }
    await this.run(`${file.path} (selection)`, text);
  }

  private async run(source: string, text: string): Promise<void> {
    (this.contentEl as { empty(): void }).empty();
    this.renderHeader(source);
    const status = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-proposal-status" });
    status.setText("Extracting facts…");

    try {
      const out = await this.api.proposeFacts({ text, source });
      status.remove();
      if (out.proposed_facts.length === 0) {
        (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-empty" })
          .setText("No facts extracted from this text.");
        return;
      }
      const cards = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-proposal-cards" });
      for (const fact of out.proposed_facts) {
        this.renderProposedFact(cards, fact, source);
      }
    } catch (err) {
      status.remove();
      const errEl = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else if (/llm_unavailable/i.test((err as Error).message)) {
        errEl.setText("LLM unavailable — start Ollama or check your cloud key in Settings.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  private renderInitial(): void {
    (this.contentEl as { empty(): void }).empty();
    (this.contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Canon Fact Proposal" });
    (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-empty" })
      .setText("Run \"Canon: Process to canon\" on a brainstorm note, or \"Canon: Extract facts from selection\" in a draft.");
  }

  private renderHeader(source: string): void {
    const header = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-proposal-header" });
    (header as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Fact proposals" });
    const sub = (header as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-proposal-source" });
    sub.setText(`from ${source}`);
  }

  private renderProposedFact(
    parent: HTMLElement,
    fact: EntityProposedFact,
    source: string,
  ): void {
    renderFactCard(
      parent,
      {
        entity: fact.entity,
        claim: fact.claim,
        confidence: fact.confidence,
        source,
      },
      {
        onAccept: async (data) => {
          await this.appendFactToEntitySheet(data.entity, data.claim, source);
        },
        onReject: () => {/* nothing */},
      },
    );
  }

  private async appendFactToEntitySheet(
    entityName: string,
    claim: string,
    source: string,
  ): Promise<void> {
    const vault = (this.app as { vault: {
      read(f: TFile): Promise<string>;
      modify(f: TFile, c: string): Promise<void>;
      create(p: string, c: string): Promise<TFile>;
      createFolder(p: string): Promise<unknown>;
      getAbstractFileByPath(p: string): unknown;
    } }).vault;

    const file = this.findEntityFile(entityName);
    if (!file) {
      const folder: EntityType = "character";
      const folderPath = entityFolderForType(folder);
      const newPath = `${folderPath}/${entityName}.md`;
      const initial = `---\ntype: character\nname: ${entityName}\n---\n\n# ${entityName}\n\n## Facts\n\n`;
      await this.ensureFolder(folderPath);
      const created = await vault.create(newPath, initial);
      const after = insertFactIntoSheet(initial, {
        claim,
        status: "draft",
        introduced_in: source,
        chapter_index: null,
      });
      await vault.modify(created, after);
      new Notice(`Created ${newPath} and added fact.`, 3000);
      return;
    }
    const before = await vault.read(file);
    const after = insertFactIntoSheet(before, {
      claim,
      status: "draft",
      introduced_in: source,
      chapter_index: null,
    });
    await vault.modify(file, after);
  }

  private findEntityFile(entityName: string): TFile | null {
    const vault = (this.app as { vault: { getAbstractFileByPath(p: string): unknown } }).vault;
    const folders = [
      "entities/characters", "entities/places", "entities/factions",
      "entities/items", "entities/events",
    ];
    for (const folder of folders) {
      const path = `${folder}/${entityName}.md`;
      const f = vault.getAbstractFileByPath(path);
      // Duck-type check for TFile (the obsidian mock makes `instanceof TFile` unreliable)
      if (f && typeof (f as { path?: unknown }).path === "string") {
        return f as TFile;
      }
    }
    return null;
  }

  private async ensureFolder(path: string): Promise<void> {
    const vault = (this.app as { vault: {
      getAbstractFileByPath(p: string): unknown;
      createFolder(p: string): Promise<unknown>;
    } }).vault;
    const existing = vault.getAbstractFileByPath(path);
    if (existing) return;
    await vault.createFolder(path);
  }
}
