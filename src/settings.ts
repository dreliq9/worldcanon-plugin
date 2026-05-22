import { App, PluginSettingTab, Setting } from "obsidian";
import type WorldcanonPlugin from "./main";

export interface WorldcanonSettings {
  sidecarUrl: string;
  pollIntervalSeconds: number;
}

export const DEFAULT_SETTINGS: WorldcanonSettings = {
  sidecarUrl: "http://127.0.0.1:7777",
  pollIntervalSeconds: 30,
};

export class WorldcanonSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: WorldcanonPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Worldbuilder Canon" });

    new Setting(containerEl)
      .setName("Sidecar URL")
      .setDesc("Base URL of the local worldcanon sidecar.")
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:7777")
          .setValue(this.plugin.settings.sidecarUrl)
          .onChange(async (value) => {
            this.plugin.settings.sidecarUrl = value.trim() || DEFAULT_SETTINGS.sidecarUrl;
            await this.plugin.saveSettings();
            this.plugin.rebuildApiClient();
          }),
      );

    new Setting(containerEl)
      .setName("Status check interval (seconds)")
      .setDesc("How often the plugin pings the sidecar for the status bar.")
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.pollIntervalSeconds))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n) && n >= 5) {
              this.plugin.settings.pollIntervalSeconds = n;
              await this.plugin.saveSettings();
              this.plugin.restartStatusPolling();
            }
          }),
      );
  }
}
