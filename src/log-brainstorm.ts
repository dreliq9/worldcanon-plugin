import { App, Notice, TFile } from "obsidian";

import { ApiClient, ApiUnavailableError } from "./api-client";

/**
 * Calls /capture to create a new brainstorm note, then opens it in Obsidian.
 */
export async function logBrainstorm(app: App, api: ApiClient): Promise<void> {
  try {
    const out = await api.capture({ text: "", source: "obsidian" });
    const workspace = (app as {
      workspace: {
        openLinkText(link: string, source: string, newLeaf?: boolean): Promise<void>;
      };
    }).workspace;
    await workspace.openLinkText(out.path, "", false);

    const vault = (app as { vault: { getAbstractFileByPath(p: string): unknown } }).vault;
    const file = vault.getAbstractFileByPath(out.path);
    if (file && typeof (file as { path?: unknown }).path === "string") {
      new Notice(`Brainstorm note created: ${out.path}`, 2000);
    }
  } catch (err) {
    if (err instanceof ApiUnavailableError) {
      new Notice("Canon: Log brainstorm — sidecar unreachable.", 4000);
    } else {
      new Notice(`Canon: Log brainstorm failed: ${(err as Error).message}`, 4000);
    }
  }
}
