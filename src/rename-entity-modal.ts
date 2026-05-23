import { App, MarkdownView, Modal, Notice, Setting, TFile } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { PlainTextRewrite, RenamePlan } from "./types";

export class RenameEntityModal extends Modal {
  private oldName: string;
  private oldFile: TFile;
  private newName = "";
  private plan: RenamePlan | null = null;
  private uncheckedRewrites = new Set<string>();

  constructor(app: App, private readonly api: ApiClient, file: TFile, oldName: string) {
    super(app);
    this.oldName = oldName;
    this.oldFile = file;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    (contentEl as { empty(): void }).empty();
    (contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: `Rename ${this.oldName}` });

    new Setting(contentEl)
      .setName("New name")
      .addText((text: { setPlaceholder(p: string): unknown; onChange(cb: (v: string) => void): unknown; inputEl: { addEventListener(e: string, h: (ev: KeyboardEvent) => void): void } }) => {
        text.setPlaceholder("e.g., Erien");
        text.onChange((v: string) => {
          this.newName = v.trim();
        });
        text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") void this.preview();
        });
      });

    new Setting(contentEl)
      .addButton((btn: { setButtonText(t: string): unknown; setCta(): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Preview");
        btn.setCta();
        btn.onClick(() => void this.preview());
      })
      .addButton((btn: { setButtonText(t: string): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Cancel");
        btn.onClick(() => this.close());
      });
  }

  onClose(): void {
    (this.contentEl as { empty(): void }).empty();
  }

  private async preview(): Promise<void> {
    if (!this.newName) {
      new Notice("Type a new name first.");
      return;
    }
    const { contentEl } = this;
    (contentEl as { empty(): void }).empty();
    (contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: `Rename ${this.oldName} → ${this.newName}` });
    const status = (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-rename-status" });
    status.setText("Computing plan…");

    try {
      this.plan = await this.api.planEntityRename(this.oldName, { new_name: this.newName });
      status.remove();
      this.renderPlan(this.plan);
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

  private renderPlan(plan: RenamePlan): void {
    const { contentEl } = this;
    (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-rename-summary" })
      .setText(`Entity file: ${plan.entity_file} → ${plan.new_entity_file}. ` +
               `${plan.plain_text_rewrites.length} plain-text rewrite(s), ` +
               `${plan.alias_updates.length} other entity sheet(s) reference the old name.`);

    if (plan.plain_text_rewrites.length > 0) {
      (contentEl as { createEl(t: string, o: { text: string }): unknown })
        .createEl("h3", { text: "Plain-text rewrites (uncheck to skip)" });
      const list = (contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-rename-rewrites" });
      for (const r of plan.plain_text_rewrites) {
        this.renderRewriteRow(list, r);
      }
    }

    if (plan.alias_updates.length > 0) {
      (contentEl as { createEl(t: string, o: { text: string }): unknown })
        .createEl("h3", { text: "Other entity sheets reference the old name" });
      const noteEl = (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-rename-aliases" });
      noteEl.setText("These will NOT be auto-edited. After applying, open each file to update aliases / relationships manually:");
      const list = (contentEl as { createEl(t: string, o: { cls: string }): HTMLElement })
        .createEl("ul", { cls: "worldcanon-rename-aliases-list" });
      for (const u of plan.alias_updates) {
        (list as { createEl(t: string, o: { text: string }): HTMLElement })
          .createEl("li", { text: u.file });
      }
    }

    new Setting(contentEl)
      .addButton((btn: { setButtonText(t: string): unknown; setCta(): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Apply");
        btn.setCta();
        btn.onClick(() => void this.apply());
      })
      .addButton((btn: { setButtonText(t: string): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Cancel");
        btn.onClick(() => this.close());
      });
  }

  private renderRewriteRow(parent: HTMLElement, r: PlainTextRewrite): void {
    const row = (parent as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-rename-row" });
    const checkbox = (row as { createEl(t: string, o: { type: string }): HTMLInputElement })
      .createEl("input", { type: "checkbox" });
    checkbox.checked = true;
    const key = `${r.file}:${r.line}:${r.col}`;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) this.uncheckedRewrites.delete(key);
      else this.uncheckedRewrites.add(key);
    });
    (row as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("span", {
        cls: "worldcanon-rename-loc",
        text: `${r.file}:L${r.line}:${r.col}`,
      });
  }

  private async apply(): Promise<void> {
    if (!this.plan) return;

    const vault = (this.app as { vault: {
      read(f: TFile): Promise<string>;
      modify(f: TFile, c: string): Promise<void>;
      getAbstractFileByPath(p: string): unknown;
    } }).vault;
    const fileManager = (this.app as { fileManager: {
      renameFile(file: TFile, newPath: string): Promise<void>;
    } }).fileManager;

    try {
      await fileManager.renameFile(this.oldFile, this.plan.new_entity_file);
    } catch (err) {
      new Notice(`Failed to rename entity sheet: ${(err as Error).message}`, 5000);
      return;
    }

    let applied = 0;
    let failed = 0;
    for (const r of this.plan.plain_text_rewrites) {
      const key = `${r.file}:${r.line}:${r.col}`;
      if (this.uncheckedRewrites.has(key)) continue;
      const file = vault.getAbstractFileByPath(r.file);
      if (!file || typeof (file as { path?: unknown }).path !== "string") {
        failed++;
        continue;
      }
      try {
        const text = await vault.read(file as TFile);
        const lines = text.split("\n");
        const idx = r.line - 1;
        if (idx >= lines.length) { failed++; continue; }
        const line = lines[idx];
        if (line.slice(r.col, r.col + r.old.length) !== r.old) { failed++; continue; }
        lines[idx] = line.slice(0, r.col) + r.new + line.slice(r.col + r.old.length);
        await vault.modify(file as TFile, lines.join("\n"));
        applied++;
      } catch {
        failed++;
      }
    }

    new Notice(
      `Renamed entity. Applied ${applied} text rewrites, ${failed} failed. ` +
      (this.plan.alias_updates.length > 0
        ? `${this.plan.alias_updates.length} other files reference the old name — open them to update manually.`
        : ""),
      6000,
    );
    this.close();
  }
}
