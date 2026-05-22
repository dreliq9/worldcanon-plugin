import { ApiClient } from "./api-client";

export interface FactCardData {
  entity: string;
  claim: string;
  confidence: "high" | "medium" | "low";
  source?: string;
}

export interface FactCardHandlers {
  onAccept: (data: FactCardData) => Promise<void> | void;
  onReject: (data: FactCardData) => void;
}

export function renderFactCard(
  parent: HTMLElement,
  data: FactCardData,
  handlers: FactCardHandlers,
): HTMLElement {
  const card = (parent as { createDiv(o: { cls: string }): HTMLElement }).createDiv({
    cls: "worldcanon-fact-card",
  });
  (card as { addClass(c: string): void }).addClass(`worldcanon-fact-card-${data.confidence}`);

  const head = (card as { createDiv(o: { cls: string }): HTMLElement }).createDiv({
    cls: "worldcanon-fact-card-head",
  });
  (head as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
    .createEl("span", { cls: "worldcanon-fact-card-entity", text: data.entity });
  (head as { createEl(t: string, o: { cls: string; text: string }): HTMLElement })
    .createEl("span", { cls: "worldcanon-fact-card-confidence", text: `(${data.confidence})` });

  const claimEl = (card as { createEl(t: string, o: { cls: string }): HTMLTextAreaElement })
    .createEl("textarea", { cls: "worldcanon-fact-card-claim" });
  claimEl.value = data.claim;
  claimEl.rows = 2;

  if (data.source) {
    const cite = (card as { createEl(t: string, o: { cls: string }): HTMLElement & { setText(s: string): void } })
      .createEl("div", { cls: "worldcanon-fact-card-source" });
    cite.setText(`from ${data.source}`);
  }

  const actions = (card as { createDiv(o: { cls: string }): HTMLElement }).createDiv({
    cls: "worldcanon-fact-card-actions",
  });
  const acceptBtn = (actions as { createEl(t: string, o: { text: string; cls?: string }): HTMLButtonElement & { setText(s: string): void } })
    .createEl("button", { text: "Accept", cls: "mod-cta" });
  const rejectBtn = (actions as { createEl(t: string, o: { text: string }): HTMLButtonElement & { setText(s: string): void } })
    .createEl("button", { text: "Reject" });

  acceptBtn.addEventListener("click", () => {
    const updated: FactCardData = { ...data, claim: claimEl.value.trim() };
    if (!updated.claim) return;
    acceptBtn.setAttribute("disabled", "true");
    rejectBtn.setAttribute("disabled", "true");
    void Promise.resolve(handlers.onAccept(updated))
      .then(() => {
        (card as { addClass(c: string): void }).addClass("worldcanon-fact-card-accepted");
        acceptBtn.setText("Accepted ✓");
      })
      .catch((err) => {
        acceptBtn.removeAttribute("disabled");
        rejectBtn.removeAttribute("disabled");
        const errEl = (card as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } })
          .createDiv({ cls: "worldcanon-error" });
        errEl.setText(`Failed: ${(err as Error).message}`);
      });
  });

  rejectBtn.addEventListener("click", () => {
    handlers.onReject(data);
    (card as { addClass(c: string): void }).addClass("worldcanon-fact-card-rejected");
    rejectBtn.setText("Rejected");
    acceptBtn.setAttribute("disabled", "true");
    rejectBtn.setAttribute("disabled", "true");
  });

  return card;
}
