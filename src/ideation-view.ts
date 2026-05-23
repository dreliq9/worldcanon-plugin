import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError, LlmUnavailableError } from "./api-client";
import { renderFactCard } from "./fact-card";
import { insertFactIntoSheet } from "./fact-insertion";
import type { ProposedFact } from "./types";

export const IDEATION_VIEW_TYPE = "worldcanon-ideation-view";

export class IdeationView extends ItemView {
  private sessionId: string | null = null;
  private entityName: string | null = null;
  private entityFile: TFile | null = null;

  constructor(leaf: WorkspaceLeaf, private api: ApiClient) {
    super(leaf);
  }

  getViewType(): string {
    return IDEATION_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Canon Ideation";
  }

  getIcon(): string {
    return "lightbulb";
  }

  setApiClient(api: ApiClient): void {
    this.api = api;
  }

  async onOpen(): Promise<void> {
    (this.contentEl as { addClass(c: string): void }).addClass("worldcanon-ideation-view");
    this.renderInitial();
  }

  async onClose(): Promise<void> {}

  async startForActiveNote(): Promise<void> {
    const workspace = (this.app as { workspace: { getActiveViewOfType<T>(t: unknown): T | null } }).workspace;
    const active = workspace.getActiveViewOfType<{ file: TFile | null }>(MarkdownView);
    const file = active?.file ?? null;
    if (!file) {
      new Notice("Open an entity sheet first.");
      return;
    }
    if (!file.path.startsWith("entities/")) {
      new Notice("Canon: Develop this entity expects an entity sheet (entities/...).");
      return;
    }
    this.entityFile = file;
    const name = file.basename;
    this.entityName = name;

    (this.contentEl as { empty(): void }).empty();
    const status = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-ideation-status" });
    status.setText(`Starting ideation for ${name}…`);

    try {
      const out = await this.api.startIdeation({ entity: name });
      this.sessionId = out.session_id;
      (this.contentEl as { empty(): void }).empty();
      this.renderHeader();
      this.renderQuestion(out.first_question);
      this.renderAnswerForm();
    } catch (err) {
      (this.contentEl as { empty(): void }).empty();
      const errEl = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-error" });
      if (err instanceof ApiUnavailableError) {
        errEl.setText("Sidecar unreachable.");
      } else if (err instanceof LlmUnavailableError) {
        errEl.setText(err.hint || "LLM unavailable. Check that Ollama is running.");
      } else if (/not found/i.test((err as Error).message)) {
        errEl.setText(`Entity ${name} not found in canon. Save the sheet first, then try again.`);
      } else {
        errEl.setText((err as Error).message);
      }
    }
  }

  private renderInitial(): void {
    (this.contentEl as { empty(): void }).empty();
    (this.contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Canon Ideation" });
    (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-empty" })
      .setText("Open an entity sheet and run \"Canon: Develop this entity\".");
  }

  private renderHeader(): void {
    const header = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-ideation-header" });
    (header as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: `Develop ${this.entityName ?? ""}` });
    const endBtn = (header as { createEl(t: string, o: { text: string }): HTMLButtonElement })
      .createEl("button", { text: "End session" });
    endBtn.addEventListener("click", () => {
      this.sessionId = null;
      this.entityName = null;
      this.entityFile = null;
      this.renderInitial();
    });
  }

  private renderQuestion(text: string): void {
    const q = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-ideation-question" });
    q.setText(text);
  }

  private renderAnswerForm(): void {
    const form = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-ideation-form" });
    const textarea = (form as { createEl(t: string, o: { cls: string }): HTMLTextAreaElement })
      .createEl("textarea", { cls: "worldcanon-ideation-textarea" });
    textarea.rows = 4;
    textarea.placeholder = "Type your answer…";

    const submit = (form as { createEl(t: string, o: { text: string; cls?: string }): HTMLButtonElement })
      .createEl("button", { text: "Submit", cls: "mod-cta" });
    submit.addEventListener("click", () => void this.submitAnswer(textarea.value));
    textarea.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        void this.submitAnswer(textarea.value);
      }
    });
  }

  private async submitAnswer(answer: string): Promise<void> {
    const trimmed = answer.trim();
    if (!trimmed || !this.sessionId) return;

    const writerBubble = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-ideation-writer" });
    writerBubble.setText(trimmed);

    const oldForm = (this.contentEl as HTMLElement).querySelector(".worldcanon-ideation-form");
    if (oldForm) oldForm.remove();

    const status = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-ideation-status" });
    status.setText("Thinking…");

    try {
      const out = await this.api.respondToIdeation(this.sessionId, { answer: trimmed });
      status.remove();

      if (out.proposed_facts.length > 0) {
        const cards = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement })
          .createDiv({ cls: "worldcanon-ideation-cards" });
        for (const fact of out.proposed_facts) {
          this.renderProposedFact(cards, fact);
        }
      }

      if (out.next_question) {
        this.renderQuestion(out.next_question);
        this.renderAnswerForm();
      } else {
        const done = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-empty" });
        done.setText("No further questions. Session continues if you have more to add.");
        this.renderAnswerForm();
      }
    } catch (err) {
      status.remove();
      const errEl = (this.contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
        .createDiv({ cls: "worldcanon-error" });
      errEl.setText((err as Error).message);
      this.renderAnswerForm();
    }
  }

  private renderProposedFact(parent: HTMLElement, fact: ProposedFact): void {
    if (!this.entityName) return;
    renderFactCard(
      parent,
      {
        entity: this.entityName,
        claim: fact.claim,
        confidence: fact.confidence,
      },
      {
        onAccept: async (data) => {
          await this.appendFactToSheet(data.claim);
        },
        onReject: () => {/* nothing */},
      },
    );
  }

  private async appendFactToSheet(claim: string): Promise<void> {
    if (!this.entityFile) throw new Error("no entity file open");
    const vault = (this.app as { vault: { read(f: TFile): Promise<string>; modify(f: TFile, c: string): Promise<void> } }).vault;
    const before = await vault.read(this.entityFile);
    const after = insertFactIntoSheet(before, {
      claim,
      status: "draft",
      introduced_in: `ideation/${this.sessionId ?? "unknown"}`,
      chapter_index: null,
    });
    await vault.modify(this.entityFile, after);
  }
}
