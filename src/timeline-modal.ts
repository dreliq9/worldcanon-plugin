import { App, Modal, Notice, TFile } from "obsidian";

import type { ApiClient } from "./api-client";
import { ApiUnavailableError } from "./api-client";
import type { TimelineEvent } from "./types";

export class TimelineModal extends Modal {
  constructor(app: App, private readonly api: ApiClient) {
    super(app);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    (contentEl as { empty(): void }).empty();
    (contentEl as { createEl(t: string, o: { text: string }): unknown })
      .createEl("h2", { text: "Canon Timeline" });

    const status = (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createDiv({ cls: "worldcanon-timeline-status" });
    status.setText("Loading…");

    try {
      const res = await this.api.timeline();
      status.remove();
      if (res.events.length === 0) {
        (contentEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-empty" })
          .setText("No timeline events yet. Set chapter_index on canon facts to populate this.");
        return;
      }
      const list = (contentEl as { createDiv(o: { cls: string }): HTMLElement })
        .createDiv({ cls: "worldcanon-timeline-list" });
      const sorted = [...res.events].sort((a, b) => {
        const aIdx = a.chapter_index ?? Number.MAX_SAFE_INTEGER;
        const bIdx = b.chapter_index ?? Number.MAX_SAFE_INTEGER;
        if (aIdx !== bIdx) return aIdx - bIdx;
        const aLabel = a.entity ?? a.name ?? "";
        const bLabel = b.entity ?? b.name ?? "";
        return aLabel.localeCompare(bLabel);
      });
      for (const ev of sorted) {
        this.renderEvent(list, ev);
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

  private renderEvent(parent: HTMLElement, ev: TimelineEvent): void {
    const row = (parent as { createDiv(o: { cls: string }): HTMLElement })
      .createDiv({ cls: "worldcanon-timeline-row" });
    const chapter = ev.chapter_index !== undefined && ev.chapter_index !== null
      ? `Ch${ev.chapter_index}`
      : (ev.date ?? "—");
    (row as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
      .createEl("span", { cls: "worldcanon-timeline-chapter", text: chapter });
    const label = ev.kind === "fact"
      ? `${ev.entity}: ${ev.claim}`
      : (ev.name ?? "event");
    const link = (row as { createEl(t: string, o: { text: string; cls: string }): HTMLElement })
      .createEl("a", { cls: "worldcanon-timeline-link", text: label });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void (this.app as { workspace: { openLinkText(link: string, source: string, newLeaf?: boolean): Promise<void> } })
        .workspace.openLinkText(ev.source_file, "", false);
      this.close();
    });
  }
}
