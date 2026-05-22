import { ApiClient, ApiUnavailableError } from "./api-client";

export class StatusBar {
  private interval: number | null = null;

  constructor(
    private readonly el: HTMLElement,
    private apiClient: ApiClient,
    private pollSeconds: number,
  ) {
    el.addClass("worldcanon-status");
    this.setUnknown();
  }

  start(): void {
    this.stop();
    void this.refresh();
    this.interval = window.setInterval(() => void this.refresh(), this.pollSeconds * 1000);
  }

  stop(): void {
    if (this.interval !== null) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  setApiClient(client: ApiClient): void {
    this.apiClient = client;
    void this.refresh();
  }

  setPollSeconds(seconds: number): void {
    this.pollSeconds = seconds;
    if (this.interval !== null) {
      this.start();
    }
  }

  async refresh(): Promise<void> {
    try {
      const stats = await this.apiClient.stats();
      const totalChunks = stats.corpora.reduce((sum, c) => sum + c.chunk_count, 0);
      this.el.setText(`Canon: ✓ ${totalChunks} chunks, ${stats.fact_count} facts`);
      this.el.removeClass("worldcanon-status-down");
      this.el.addClass("worldcanon-status-ok");
    } catch (err) {
      const reason = err instanceof ApiUnavailableError ? "sidecar down" : "error";
      this.el.setText(`Canon: ✗ ${reason}`);
      this.el.removeClass("worldcanon-status-ok");
      this.el.addClass("worldcanon-status-down");
    }
  }

  private setUnknown(): void {
    this.el.setText("Canon: …");
  }
}
