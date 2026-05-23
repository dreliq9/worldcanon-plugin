import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError, LlmUnavailableError } from "./api-client";
import type {
  InboxItem,
  TriageClassification,
  TriageSuggestResponse,
} from "./types";

export const TRIAGE_VIEW_TYPE = "worldcanon-triage-view";

const ALL_DESTINATIONS: TriageClassification[] = [
  "canon",
  "drafts",
  "entities/characters",
  "entities/places",
  "entities/factions",
  "entities/items",
  "entities/events",
  "research",
  "discard",
];

export class TriageView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private api: ApiClient) {
    super(leaf);
  }

  getViewType(): string {
    return TRIAGE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Canon Triage";
  }

  getIcon(): string {
    return "inbox";
  }

  setApiClient(api: ApiClient): void {
    this.api = api;
  }

  async onOpen(): Promise<void> {
    (this.contentEl as { addClass(c: string): void }).addClass("worldcanon-triage-view");
    await this.reload();
  }

  async onClose(): Promise<void> {}

  async reload(): Promise<void> {
    (this.contentEl as { empty(): void }).empty();
    const header = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-triage-header" });
    (header as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Triage inbox" });
    const refreshBtn = (header as { createEl(t: string, o: { text: string }): HTMLButtonElement })
      .createEl("button", { text: "Refresh" });
    refreshBtn.addEventListener("click", () => void this.reload());

    const status = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-triage-status" });
    status.setText("Loading…");

    try {
      const res = await this.api.listInbox();
      status.remove();
      if (res.items.length === 0) {
        (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-empty" })
          .setText("Inbox is empty. Run worldcanon-import or drop files into _inbox/.");
        return;
      }
      const cards = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-triage-cards" });
      for (const item of res.items) {
        this.renderInboxCard(cards, item);
      }
    } catch (err) {
      status.remove();
      const errEl = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  private renderInboxCard(parent: HTMLElement, item: InboxItem): void {
    const card = (parent as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-triage-card" });

    const head = (card as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-triage-card-head" });
    (head as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("div", { cls: "worldcanon-triage-filename", text: item.path });
    (head as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("div", { cls: "worldcanon-triage-preview", text: item.preview });

    const suggestionEl = (card as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void; empty(): void; addClass(c: string): void; createEl(t: string, o: { cls: string; text: string }): HTMLElement } })
      .createDiv({ cls: "worldcanon-triage-suggestion" });
    suggestionEl.setText("Asking LLM…");

    void this.api.triageSuggest({ path: item.path })
      .then((res) => this.renderSuggestion(suggestionEl, res))
      .catch((err) => {
        if (err instanceof ApiUnavailableError) {
          suggestionEl.setText("(sidecar unreachable)");
        } else if (err instanceof LlmUnavailableError) {
          // Triage inline cell is space-constrained — use a short label and
          // expose the actionable hint as a tooltip.
          suggestionEl.setText("(LLM unavailable — hover for details)");
          (suggestionEl as { title?: string }).title = err.hint || err.reason;
        } else {
          suggestionEl.setText(`(error: ${(err as Error).message})`);
        }
      });

    const actions = (card as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-triage-actions" });
    for (const dest of ALL_DESTINATIONS) {
      const btn = (actions as { createEl(t: string, o: { text: string }): HTMLButtonElement })
        .createEl("button", { text: dest === "discard" ? "Discard" : dest });
      btn.addEventListener("click", () => void this.applyDestination(card, item, dest));
    }
  }

  private renderSuggestion(el: HTMLElement, res: TriageSuggestResponse): void {
    (el as { empty(): void }).empty();
    (el as { addClass(c: string): void }).addClass(`worldcanon-triage-confidence-${res.confidence}`);
    (el as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("span", { cls: "worldcanon-triage-label",
                          text: `Suggested: ${res.classification} (${res.confidence})` });
    if (res.reasoning) {
      (el as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
        .createEl("div", { cls: "worldcanon-triage-reasoning", text: res.reasoning });
    }
  }

  private async applyDestination(
    card: HTMLElement,
    item: InboxItem,
    dest: TriageClassification,
  ): Promise<void> {
    const vault = (this.app as { vault: {
      getAbstractFileByPath(p: string): unknown;
      delete(f: TFile): Promise<void>;
    } }).vault;
    const fileManager = (this.app as { fileManager: {
      renameFile(file: TFile, newPath: string): Promise<void>;
    } }).fileManager;

    const file = vault.getAbstractFileByPath(item.vault_path);
    if (!file || typeof (file as { path?: unknown }).path !== "string") {
      new Notice(`File not found: ${item.vault_path}`, 4000);
      return;
    }

    if (dest === "discard") {
      try {
        await vault.delete(file as TFile);
        (card as { addClass(c: string): void }).addClass("worldcanon-triage-card-done");
        new Notice(`Deleted ${item.path}.`, 2000);
      } catch (err) {
        new Notice(`Failed to delete: ${(err as Error).message}`, 4000);
      }
      return;
    }

    const basename = item.path.split("/").pop() ?? item.path;
    const newPath = `${dest}/${basename}`;
    try {
      await this.ensureFolder(dest);
      await fileManager.renameFile(file as TFile, newPath);
      (card as { addClass(c: string): void }).addClass("worldcanon-triage-card-done");
      new Notice(`Moved to ${newPath}`, 2000);
    } catch (err) {
      new Notice(`Failed: ${(err as Error).message}`, 4000);
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    const vault = (this.app as { vault: {
      getAbstractFileByPath(p: string): unknown;
      createFolder(p: string): Promise<unknown>;
    } }).vault;
    const parts = path.split("/");
    let cursor = "";
    for (const part of parts) {
      cursor = cursor ? `${cursor}/${part}` : part;
      if (vault.getAbstractFileByPath(cursor)) continue;
      try {
        await vault.createFolder(cursor);
      } catch {
        // Already exists or concurrent — ignore
      }
    }
  }
}
