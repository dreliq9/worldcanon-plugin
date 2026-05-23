import { App, Modal, Notice, Setting, TFile } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError, LlmUnavailableError } from "./api-client";
import { insertNameIntoWorkbench } from "./name-insertion";
import type { CultureSummary, NameSuggestion } from "./types";

export class SuggestNamesModal extends Modal {
  private cultures: CultureSummary[] = [];
  private chosenCulture: string | null = null;
  private role = "";
  private vibe = "";
  private count = 5;
  private resultsEl: HTMLElement | null = null;

  constructor(app: App, private readonly api: ApiClient) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Suggest names" });

    const loading = contentEl.createDiv({ cls: "worldcanon-naming-status" });
    loading.setText("Loading cultures…");

    try {
      const res = await this.api.listCultures();
      this.cultures = res.cultures;
      loading.remove();
      if (this.cultures.length === 0) {
        contentEl
          .createDiv({ cls: "worldcanon-empty" })
          .setText("No cultures yet. Create naming/<culture>.md with a ## Names section first.");
        return;
      }
      this.chosenCulture = this.cultures[0].culture;
      this.renderForm();
    } catch (err) {
      loading.remove();
      const errEl = contentEl.createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderForm(): void {
    const { contentEl } = this;

    new Setting(contentEl)
      .setName("Culture")
      .addDropdown((dd) => {
        for (const c of this.cultures) {
          dd.addOption(
            c.culture,
            `${c.culture} (${c.used_count} used / ${c.candidate_count} candidate)`,
          );
        }
        if (this.chosenCulture) dd.setValue(this.chosenCulture);
        dd.onChange((v) => {
          this.chosenCulture = v;
        });
      });

    new Setting(contentEl)
      .setName("Role")
      .setDesc("Optional. E.g., 'warrior', 'queen consort', 'young scholar'.")
      .addText((text) => {
        text.setPlaceholder("(any)");
        text.onChange((v) => {
          this.role = v.trim();
        });
      });

    new Setting(contentEl)
      .setName("Vibe")
      .setDesc("Optional. Aesthetic shorthand.")
      .addText((text) => {
        text.setPlaceholder("(any)");
        text.onChange((v) => {
          this.vibe = v.trim();
        });
      });

    new Setting(contentEl)
      .setName("Count")
      .addText((text) => {
        text.setPlaceholder("5");
        text.setValue("5");
        text.onChange((v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 20) this.count = n;
        });
      });

    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText("Generate");
        btn.setCta();
        btn.onClick(() => void this.generate());
      })
      .addButton((btn) => {
        btn.setButtonText("Close");
        btn.onClick(() => this.close());
      });

    this.resultsEl = contentEl.createDiv({ cls: "worldcanon-naming-results" });
  }

  private async generate(): Promise<void> {
    if (!this.chosenCulture || !this.resultsEl) return;
    const target = this.resultsEl;
    target.empty();
    target.setText("Generating…");

    try {
      const out = await this.api.suggestNames({
        culture: this.chosenCulture,
        role: this.role || undefined,
        vibe: this.vibe || undefined,
        count: this.count,
      });
      target.empty();
      if (out.suggestions.length === 0) {
        target
          .createDiv({ cls: "worldcanon-empty" })
          .setText("No suggestions returned. Try a different role or vibe.");
        return;
      }
      for (const suggestion of out.suggestions) {
        this.renderSuggestion(target, suggestion);
      }
    } catch (err) {
      target.empty();
      const errEl = target.createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else if (err instanceof LlmUnavailableError) {
        errEl.setText(err.hint || "LLM unavailable. Check that Ollama is running.");
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  private renderSuggestion(parent: HTMLElement, s: NameSuggestion): void {
    const card = parent.createDiv({ cls: "worldcanon-naming-card" });
    card.createEl("div", { cls: "worldcanon-naming-name", text: s.name });
    card.createEl("div", { cls: "worldcanon-naming-reason", text: s.reasoning });
    const actions = card.createDiv({ cls: "worldcanon-naming-actions" });
    const addBtn = actions.createEl("button", {
      text: "Add as candidate",
      cls: "mod-cta",
    });
    addBtn.addEventListener("click", () => {
      addBtn.setAttribute("disabled", "true");
      void this.appendName(s.name)
        .then(() => {
          addBtn.setText("Added ✓");
          card.addClass("worldcanon-naming-card-added");
        })
        .catch((err) => {
          addBtn.removeAttribute("disabled");
          const errEl = card.createDiv({ cls: "worldcanon-error" });
          errEl.setText(`Failed: ${(err as Error).message}`);
        });
    });
  }

  private async appendName(name: string): Promise<void> {
    if (!this.chosenCulture) throw new Error("no culture chosen");
    const path = `naming/${this.chosenCulture}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file || !(file instanceof TFile)) {
      throw new Error(`naming file not found: ${path}`);
    }
    const before = await this.app.vault.read(file);
    const after = insertNameIntoWorkbench(before, { name, status: "candidate" });
    await this.app.vault.modify(file, after);
    new Notice(`Added ${name} to ${path}`, 2000);
  }
}
