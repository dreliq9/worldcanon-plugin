import { Plugin } from "obsidian";

import { ApiClient } from "./api-client";
import { DEFAULT_SETTINGS, WorldcanonSettings, WorldcanonSettingTab } from "./settings";
import { StatusBar } from "./status-bar";
import { SearchModal } from "./search-modal";
import { NewEntityModal } from "./new-entity-modal";
import { AskModal } from "./ask-modal";
import { CANON_VIEW_TYPE, CanonView } from "./canon-view";
import { IDEATION_VIEW_TYPE, IdeationView } from "./ideation-view";
import { FACT_PROPOSAL_VIEW_TYPE, FactProposalView } from "./fact-proposal-view";
import { logBrainstorm } from "./log-brainstorm";
import { UnprocessedBrainstormModal } from "./unprocessed-modal";
import { SuggestNamesModal } from "./suggest-names-modal";
import { TRIAGE_VIEW_TYPE, TriageView } from "./triage-view";

export default class WorldcanonPlugin extends Plugin {
  settings!: WorldcanonSettings;
  apiClient!: ApiClient;
  private statusBar: StatusBar | null = null;
  private canonView: CanonView | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.apiClient = new ApiClient(this.settings.sidecarUrl);

    this.statusBar = new StatusBar(
      this.addStatusBarItem(),
      this.apiClient,
      this.settings.pollIntervalSeconds,
    );
    this.statusBar.start();

    this.addSettingTab(new WorldcanonSettingTab(this.app, this));

    this.addCommand({
      id: "canon-search",
      name: "Canon: Search",
      callback: () => {
        new SearchModal(this.app, this.apiClient).open();
      },
    });

    this.addCommand({
      id: "canon-new-entity",
      name: "Canon: New entity",
      callback: () => {
        new NewEntityModal(this.app, (path) => {
          void this.app.workspace.openLinkText(path, "", false);
        }).open();
      },
    });

    this.registerView(CANON_VIEW_TYPE, (leaf) => new CanonView(leaf, this.apiClient));

    this.addCommand({
      id: "canon-open-pane",
      name: "Canon: Open pane",
      callback: () => void this.activateCanonView(),
    });

    this.addCommand({
      id: "canon-ask",
      name: "Canon: Ask about my world",
      callback: () => {
        new AskModal(this.app, this.apiClient).open();
      },
    });

    this.registerView(IDEATION_VIEW_TYPE, (leaf) => new IdeationView(leaf, this.apiClient));

    this.addCommand({
      id: "canon-develop-entity",
      name: "Canon: Develop this entity",
      callback: () => void this.openIdeationView(),
    });

    this.registerView(FACT_PROPOSAL_VIEW_TYPE, (leaf) => new FactProposalView(leaf, this.apiClient));

    this.addCommand({
      id: "canon-process-to-canon",
      name: "Canon: Process to canon",
      callback: () => void this.openFactProposalView("process"),
    });

    this.addCommand({
      id: "canon-extract-facts-from-selection",
      name: "Canon: Extract facts from selection",
      callback: () => void this.openFactProposalView("selection"),
    });

    this.addCommand({
      id: "canon-log-brainstorm",
      name: "Canon: Log brainstorm",
      callback: () => void logBrainstorm(this.app, this.apiClient),
    });

    this.addCommand({
      id: "canon-show-unprocessed",
      name: "Canon: Show unprocessed brainstorm",
      callback: () => void new UnprocessedBrainstormModal(this.app, this.apiClient).loadAndOpen(),
    });

    this.addCommand({
      id: "canon-suggest-names",
      name: "Canon: Suggest names",
      callback: () => {
        new SuggestNamesModal(this.app, this.apiClient).open();
      },
    });

    this.registerView(TRIAGE_VIEW_TYPE, (leaf) => new TriageView(leaf, this.apiClient));

    this.addCommand({
      id: "canon-triage-inbox",
      name: "Canon: Triage inbox",
      callback: () => void this.openTriageView(),
    });
  }

  onunload(): void {
    this.statusBar?.stop();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  rebuildApiClient(): void {
    this.apiClient = new ApiClient(this.settings.sidecarUrl);
    this.statusBar?.setApiClient(this.apiClient);
    const workspace = (this.app as { workspace: { getLeavesOfType(t: string): { view: unknown }[] } }).workspace;
    for (const leaf of workspace.getLeavesOfType(CANON_VIEW_TYPE)) {
      const view = leaf.view as { setApiClient(c: ApiClient): void };
      if (typeof view.setApiClient === "function") view.setApiClient(this.apiClient);
    }
    for (const leaf of workspace.getLeavesOfType(IDEATION_VIEW_TYPE)) {
      const view = leaf.view as unknown as { setApiClient(c: ApiClient): void };
      if (typeof view.setApiClient === "function") view.setApiClient(this.apiClient);
    }
    for (const leaf of workspace.getLeavesOfType(FACT_PROPOSAL_VIEW_TYPE)) {
      const view = leaf.view as unknown as { setApiClient(c: ApiClient): void };
      if (typeof view.setApiClient === "function") view.setApiClient(this.apiClient);
    }
    for (const leaf of workspace.getLeavesOfType(TRIAGE_VIEW_TYPE)) {
      const view = leaf.view as unknown as { setApiClient(c: ApiClient): void };
      if (typeof view.setApiClient === "function") view.setApiClient(this.apiClient);
    }
  }

  restartStatusPolling(): void {
    this.statusBar?.setPollSeconds(this.settings.pollIntervalSeconds);
  }

  private async activateCanonView(): Promise<void> {
    const workspace = (this.app as { workspace: { getLeavesOfType(t: string): unknown[]; getRightLeaf(s: boolean): { setViewState(state: { type: string; active: boolean }): Promise<void> } | null; revealLeaf(l: unknown): void } }).workspace;
    let leaves = workspace.getLeavesOfType(CANON_VIEW_TYPE);
    if (leaves.length === 0) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;
      await rightLeaf.setViewState({ type: CANON_VIEW_TYPE, active: true });
      leaves = workspace.getLeavesOfType(CANON_VIEW_TYPE);
    }
    if (leaves[0]) workspace.revealLeaf(leaves[0]);
  }

  private async openIdeationView(): Promise<void> {
    const workspace = this.app.workspace;
    let leaves = workspace.getLeavesOfType(IDEATION_VIEW_TYPE);
    if (leaves.length === 0) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;
      await rightLeaf.setViewState({ type: IDEATION_VIEW_TYPE, active: true });
      leaves = workspace.getLeavesOfType(IDEATION_VIEW_TYPE);
    }
    if (leaves[0]) {
      workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view as IdeationView;
      void view.startForActiveNote();
    }
  }

  private async openFactProposalView(mode: "process" | "selection"): Promise<void> {
    const workspace = this.app.workspace;
    let leaves = workspace.getLeavesOfType(FACT_PROPOSAL_VIEW_TYPE);
    if (leaves.length === 0) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;
      await rightLeaf.setViewState({ type: FACT_PROPOSAL_VIEW_TYPE, active: true });
      leaves = workspace.getLeavesOfType(FACT_PROPOSAL_VIEW_TYPE);
    }
    if (leaves[0]) {
      workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view as FactProposalView;
      if (mode === "process") void view.processActiveNote();
      else void view.processSelection();
    }
  }

  private async openTriageView(): Promise<void> {
    const workspace = this.app.workspace;
    let leaves = workspace.getLeavesOfType(TRIAGE_VIEW_TYPE);
    if (leaves.length === 0) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;
      await rightLeaf.setViewState({ type: TRIAGE_VIEW_TYPE, active: true });
      leaves = workspace.getLeavesOfType(TRIAGE_VIEW_TYPE);
    }
    if (leaves[0]) {
      workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view as TriageView;
      void view.reload();
    }
  }
}
