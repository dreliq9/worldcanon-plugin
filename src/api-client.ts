import type {
  AskResponse,
  ContradictionResponse,
  EntityResponse,
  Fact,
  Relationship,
  SearchResponse,
  StatsResponse,
} from "./types";

export class ApiUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export interface SearchParams {
  q: string;
  corpus?: string[];
  limit?: number;
}

export interface FactsParams {
  entity?: string;
  status?: string;
  chapter_max?: number;
}

export interface AskParams {
  question: string;
  corpus?: string[];
  limit?: number;
}

export interface ContradictionCheckParams {
  text: string;
  entities?: string[];
  scope?: string;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async ping(): Promise<boolean> {
    try {
      await this.stats();
      return true;
    } catch {
      return false;
    }
  }

  async stats(): Promise<StatsResponse> {
    return this.getJson<StatsResponse>("/stats");
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const qs = new URLSearchParams();
    qs.set("q", params.q);
    if (params.corpus && params.corpus.length > 0) {
      qs.set("corpus", params.corpus.join(","));
    }
    if (params.limit !== undefined) {
      qs.set("limit", String(params.limit));
    }
    return this.getJson<SearchResponse>(`/search?${qs.toString()}`);
  }

  async entity(name: string): Promise<EntityResponse> {
    return this.getJson<EntityResponse>(`/entity/${encodeURIComponent(name)}`);
  }

  async facts(params: FactsParams = {}): Promise<{ facts: Fact[] }> {
    const qs = new URLSearchParams();
    if (params.entity) qs.set("entity", params.entity);
    if (params.status) qs.set("status", params.status);
    if (params.chapter_max !== undefined) qs.set("chapter_max", String(params.chapter_max));
    const tail = qs.toString();
    return this.getJson<{ facts: Fact[] }>(tail ? `/facts?${tail}` : "/facts");
  }

  async relationships(entity?: string): Promise<{ relationships: Relationship[] }> {
    const path = entity
      ? `/relationships?entity=${encodeURIComponent(entity)}`
      : "/relationships";
    return this.getJson<{ relationships: Relationship[] }>(path);
  }

  async ask(params: AskParams): Promise<AskResponse> {
    return this.postJson<AskResponse>("/ask", params);
  }

  async contradictionCheck(params: ContradictionCheckParams): Promise<ContradictionResponse> {
    return this.postJson<ContradictionResponse>("/contradiction-check", params);
  }

  private async getJson<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      throw new ApiUnavailableError(
        `sidecar unreachable at ${this.baseUrl}`,
        err,
      );
    }
    if (!res.ok) {
      const detail = res.status === 404 ? "not found" : `${res.status} ${res.statusText}`;
      throw new Error(`sidecar request failed: ${path} (${detail})`);
    }
    return (await res.json()) as T;
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ApiUnavailableError(
        `sidecar unreachable at ${this.baseUrl}`,
        err,
      );
    }
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const payload = await res.json();
        if (payload?.detail?.status === "llm_unavailable") {
          throw new Error(
            `llm_unavailable: ${payload.detail.reason ?? "no reason"}`,
          );
        }
        if (payload?.detail) detail = JSON.stringify(payload.detail);
      } catch (jsonErr) {
        if (jsonErr instanceof Error && jsonErr.message.includes("llm_unavailable")) {
          throw jsonErr;
        }
        // fall through with the status detail
      }
      throw new Error(`sidecar request failed: ${path} (${detail})`);
    }
    return (await res.json()) as T;
  }
}
