import { App, MarkdownView, Modal, Notice, TFile } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { UnlinkedMention } from "./types";

export class UnlinkedMentionsModal extends Modal {
  private file: TFile | null = null;
  private mentions: UnlinkedMention[] = [];

  constructor(app: App, private readonly api: ApiClient) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    (contentEl as { empty(): void }).empty();
    (contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Find unlinked mentions" });

    const active = (this.app as { workspace: { getActiveViewOfType<T>(t: unknown): T | null } })
      .workspace.getActiveViewOfType<{ file: TFile | null }>(MarkdownView);
    const file = active?.file ?? null;
    if (!file) {
      (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-empty" })
        .setText("Open a note first.");
      return;
    }
    this.file = file;

    const status = (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-mentions-status" });
    status.setText(`Scanning ${file.path}…`);

    try {
      const res = await this.api.unlinkedMentions({ file: file.path });
      this.mentions = res.mentions;
      status.remove();
      if (this.mentions.length === 0) {
        (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-empty" })
          .setText("No unlinked entity mentions found.");
        return;
      }
      const list = (contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-mentions-list" });
      for (const m of this.mentions) {
        this.renderMentionRow(list, m);
      }
    } catch (err) {
      status.remove();
      const errEl = (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  onClose(): void {
    (this.contentEl as { empty(): void }).empty();
  }

  private renderMentionRow(parent: HTMLElement, m: UnlinkedMention): void {
    const row = (parent as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-mentions-row" });
    (row as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("span", {
        cls: "worldcanon-mentions-loc",
        text: `L${m.line}:${m.col} ${m.match}`,
      });
    const btn = (row as { createEl(t: string, o: { text: string; cls: string }): HTMLButtonElement & { setText(s: string): void } })
      .createEl("button", { text: "Wikify", cls: "mod-cta" });
    btn.addEventListener("click", () => {
      btn.setAttribute("disabled", "true");
      void this.wikifyMention(m)
        .then(() => {
          btn.setText("Done ✓");
          (row as { addClass(c: string): void }).addClass("worldcanon-mentions-row-done");
        })
        .catch((err) => {
          btn.removeAttribute("disabled");
          const errEl = (row as { createEl(t: string, o: { cls: string }): HTMLElement & { setText(s: string): void } })
            .createEl("div", { cls: "worldcanon-error" });
          errEl.setText(`Failed: ${(err as Error).message}`);
        });
    });
  }

  private async wikifyMention(m: UnlinkedMention): Promise<void> {
    if (!this.file) throw new Error("no active file");
    const vault = (this.app as { vault: { read(f: TFile): Promise<string>; modify(f: TFile, c: string): Promise<void> } }).vault;
    const text = await vault.read(this.file);
    const lines = text.split("\n");
    const idx = m.line - 1;
    if (idx >= lines.length) throw new Error("line out of range — file may have been edited");
    const line = lines[idx];
    if (line.slice(m.col, m.col + m.match.length) !== m.match) {
      throw new Error("file has changed since scan — rerun the command");
    }
    lines[idx] = line.slice(0, m.col) + m.suggested_link + line.slice(m.col + m.match.length);
    await vault.modify(this.file, lines.join("\n"));
    new Notice(`Linked ${m.match}`, 1500);
  }
}
