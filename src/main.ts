import { Plugin } from "obsidian";

import { ApiClient } from "./api-client";
import { DEFAULT_SETTINGS, WorldcanonSettings, WorldcanonSettingTab } from "./settings";
import { StatusBar } from "./status-bar";
import { SearchModal } from "./search-modal";
import { NewEntityModal } from "./new-entity-modal";

export default class WorldcanonPlugin extends Plugin {
  settings!: WorldcanonSettings;
  apiClient!: ApiClient;
  private statusBar: StatusBar | null = null;

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
  }

  restartStatusPolling(): void {
    this.statusBar?.setPollSeconds(this.settings.pollIntervalSeconds);
  }
}
