import { App, FuzzySuggestModal, Notice } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { UnprocessedBrainstormNote } from "./types";

export class UnprocessedBrainstormModal extends FuzzySuggestModal<UnprocessedBrainstormNote> {
  private notes: UnprocessedBrainstormNote[] = [];

  constructor(app: App, private readonly api: ApiClient) {
    super(app);
    this.setPlaceholder("Unprocessed brainstorm notes…");
  }

  async loadAndOpen(): Promise<void> {
    try {
      const res = await this.api.unprocessedBrainstorm();
      this.notes = res.notes;
      if (this.notes.length === 0) {
        new Notice("No unprocessed brainstorm notes.", 3000);
        return;
      }
      this.open();
      (this as unknown as { updateSuggestions(): void }).updateSuggestions?.();
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        new Notice("Canon: sidecar unreachable.", 3000);
      } else {
        new Notice(`Canon: ${(err as Error).message}`, 4000);
      }
    }
  }

  getItems(): UnprocessedBrainstormNote[] {
    return this.notes;
  }

  getItemText(note: UnprocessedBrainstormNote): string {
    const date = note.date ?? "?";
    return `[${date}] ${note.source_path} — ${note.preview}`;
  }

  onChooseItem(note: UnprocessedBrainstormNote, _evt: MouseEvent | KeyboardEvent): void {
    void (this.app as { workspace: { openLinkText(link: string, source: string, newLeaf?: boolean): Promise<void> } })
      .workspace.openLinkText(note.source_path, "", false);
  }
}
