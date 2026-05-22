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

    (containerEl as { createEl(t: string, o?: unknown): unknown }).createEl("h3", { text: "Sidecar status" });

    const statusEl = (containerEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } }).createDiv({ cls: "worldcanon-settings-status" });
    statusEl.setText("Checking…");

    void (async () => {
      try {
        const stats = await this.plugin.apiClient.stats();
        const totalChunks = stats.corpora.reduce((s, c) => s + c.chunk_count, 0);
        statusEl.setText(
          `✓ Sidecar reachable. ${totalChunks} chunks, ${stats.fact_count} facts. Embedder: ${stats.embedder}.`,
        );
      } catch (err) {
        statusEl.setText("✗ Sidecar unreachable. Start the sidecar process.");
      }
    })();

    (containerEl as { createEl(t: string, o?: unknown): unknown }).createEl("h3", { text: "LLM" });
    const llmHelp = (containerEl as { createDiv(o: { cls: string }): HTMLElement & { setText(s: string): void } }).createDiv({ cls: "worldcanon-settings-help" });
    llmHelp.setText(
      "LLM backend (local Ollama vs Ollama Cloud) and model name are configured server-side via " +
      "WORLDCANON_LLM_BACKEND, WORLDCANON_OLLAMA_URL, WORLDCANON_OLLAMA_API_KEY, and " +
      "WORLDCANON_LLM_MODEL environment variables on the sidecar process. " +
      "See the worldcanon README for setup.",
    );
  }
}
