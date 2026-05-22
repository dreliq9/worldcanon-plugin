import { App, Modal, Notice, Setting } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";

export class AskModal extends Modal {
  private question = "";
  private answerEl: HTMLElement | null = null;

  constructor(app: App, private readonly api: ApiClient) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    (contentEl as { empty(): void }).empty();
    (contentEl as { createEl(t: string, o?: unknown): { setText(s: string): void } })
      .createEl("h2", { text: "Ask about my world" });

    new Setting(contentEl)
      .setName("Question")
      .addText((text: { setPlaceholder(p: string): unknown; onChange(cb: (v: string) => void): unknown; inputEl: { addEventListener(e: string, h: (ev: KeyboardEvent) => void): void } }) => {
        text.setPlaceholder("e.g., What color are Aerin's eyes?");
        text.onChange((v: string) => {
          this.question = v.trim();
        });
        text.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") void this.submit();
        });
      });

    new Setting(contentEl)
      .addButton((btn: { setButtonText(t: string): unknown; setCta(): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Ask");
        btn.setCta();
        btn.onClick(() => void this.submit());
      })
      .addButton((btn: { setButtonText(t: string): unknown; onClick(cb: () => void): unknown }) => {
        btn.setButtonText("Close");
        btn.onClick(() => this.close());
      });

    this.answerEl = (contentEl as { createDiv(o: { cls: string }): HTMLElement }).createDiv({ cls: "worldcanon-ask-answer" });
  }

  onClose(): void {
    (this.contentEl as { empty(): void }).empty();
  }

  private async submit(): Promise<void> {
    if (!this.question) {
      new Notice("Type a question first.");
      return;
    }
    if (!this.answerEl) return;
    const target = this.answerEl;
    (target as { empty(): void }).empty();
    (target as { setText(s: string): void }).setText("Asking…");
    try {
      const out = await this.api.ask({ question: this.question, limit: 5 });
      (target as { empty(): void }).empty();
      const ans = (target as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("p", { cls: "worldcanon-ask-text" });
      ans.setText(out.answer);
      if (out.citations.length > 0) {
        const header = (target as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
          .createEl("div", { cls: "worldcanon-ask-citations-header" });
        header.setText("Sources:");
        const list = (target as { createEl(t: string, o: { cls: string }): HTMLElement })
          .createEl("ul", { cls: "worldcanon-ask-citations" });
        for (const cite of out.citations) {
          const li = (list as { createEl(t: string): HTMLElement }).createEl("li");
          const a = (li as { createEl(t: string, o: { text: string; cls: string }): HTMLElement })
            .createEl("a", { text: cite, cls: "worldcanon-citation-link" });
          a.addEventListener("click", (e: Event) => {
            e.preventDefault();
            void (this.app as { workspace: { openLinkText(link: string, source: string, newLeaf?: boolean): Promise<void> } })
              .workspace.openLinkText(cite, "", false);
          });
        }
      }
    } catch (err) {
      (target as { empty(): void }).empty();
      const errEl = (target as { createEl(t: string, o: { cls: string }): { setText(s: string): void } })
        .createEl("div", { cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else if (/llm_unavailable/i.test((err as Error).message)) {
        errEl.setText("LLM unavailable — start Ollama or check your cloud key in Settings.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }
}
