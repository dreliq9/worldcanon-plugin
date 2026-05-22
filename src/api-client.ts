import type {
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
}
