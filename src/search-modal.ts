import { App, FuzzySuggestModal, Notice } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { SearchHit } from "./types";

export class SearchModal extends FuzzySuggestModal<SearchHit> {
  private hits: SearchHit[] = [];
  private debounce: number | null = null;

  constructor(app: App, private readonly api: ApiClient) {
    super(app);
    this.setPlaceholder("Search canon, drafts, entities, brainstorm…");
  }

  getItems(): SearchHit[] {
    return this.hits;
  }

  getItemText(hit: SearchHit): string {
    const title = hit.title ?? hit.source_path;
    const snippet = hit.body.slice(0, 120).replace(/\s+/g, " ");
    return `[${hit.corpus}] ${title} — ${snippet}`;
  }

  onChooseItem(hit: SearchHit, _evt: MouseEvent | KeyboardEvent): void {
    void this.app.workspace.openLinkText(hit.source_path, "", false);
  }

  onOpen(): void {
    super.onOpen();
    const input = (this as unknown as { inputEl: HTMLInputElement }).inputEl;
    input.addEventListener("input", () => this.scheduleQuery(input.value));
  }

  onClose(): void {
    super.onClose();
    if (this.debounce !== null) window.clearTimeout(this.debounce);
  }

  private scheduleQuery(q: string): void {
    if (this.debounce !== null) window.clearTimeout(this.debounce);
    this.debounce = window.setTimeout(() => void this.runQuery(q), 200);
  }

  private async runQuery(q: string): Promise<void> {
    if (!q.trim()) {
      this.hits = [];
      (this as unknown as { updateSuggestions(): void }).updateSuggestions?.();
      return;
    }
    try {
      const res = await this.api.search({ q, limit: 20 });
      this.hits = res.results;
      (this as unknown as { updateSuggestions(): void }).updateSuggestions?.();
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        new Notice("Canon search: sidecar unreachable.", 4000);
      } else {
        new Notice(`Canon search: ${(err as Error).message}`, 4000);
      }
    }
  }
}
