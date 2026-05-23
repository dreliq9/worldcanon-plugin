import type {
  AskResponse,
  CaptureResponse,
  ContradictionResponse,
  CulturesResponse,
  EntityResponse,
  Fact,
  IdeationRespondResponse,
  IdeationStartResponse,
  InboxResponse,
  NameSuggestResponse,
  ProposeFactsResponse,
  RenamePlan,
  Relationship,
  SearchResponse,
  StatsResponse,
  TimelineResponse,
  TriageSuggestResponse,
  UnlinkedMentionsResponse,
  UnprocessedBrainstormResponse,
} from "./types";

export class ApiUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly hint: string,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export interface SearchParams {
  q: string;
  corpus?: string[];
  limit?: number;
}

export type ViewMode = "gm" | "player";

export interface FactsParams {
  entity?: string;
  status?: string;
  chapter_max?: number;
  view?: ViewMode;
}

export interface PlayerWikiEntry {
  name: string;
  source_path: string;
  title: string | null;
  body: string;
  metadata: Record<string, unknown>;
  facts: Fact[];
}

export interface PlayerWikiResponse {
  generated_at: string;
  entry_count: number;
  entries: PlayerWikiEntry[];
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

export interface StartIdeationParams {
  entity: string;
}

export interface RespondToIdeationParams {
  answer: string;
}

export interface ProposeFactsParams {
  text: string;
  source: string;
}

export interface CaptureParams {
  text: string;
  source?: string;
  entities?: string[];
  topics?: string[];
}

export interface SuggestNamesParams {
  culture: string;
  role?: string;
  vibe?: string;
  count?: number;
}

export interface TriageSuggestParams {
  path: string;
}

export interface UnlinkedMentionsParams {
  file: string;
}

export interface PlanEntityRenameParams {
  new_name: string;
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

  async entity(name: string, view: ViewMode = "gm"): Promise<EntityResponse> {
    const qs = view === "player" ? "?view=player" : "";
    return this.getJson<EntityResponse>(`/entity/${encodeURIComponent(name)}${qs}`);
  }

  async facts(params: FactsParams = {}): Promise<{ facts: Fact[] }> {
    const qs = new URLSearchParams();
    if (params.entity) qs.set("entity", params.entity);
    if (params.status) qs.set("status", params.status);
    if (params.chapter_max !== undefined) qs.set("chapter_max", String(params.chapter_max));
    if (params.view) qs.set("view", params.view);
    const tail = qs.toString();
    return this.getJson<{ facts: Fact[] }>(tail ? `/facts?${tail}` : "/facts");
  }

  async exportPlayerWiki(): Promise<PlayerWikiResponse> {
    return this.getJson<PlayerWikiResponse>("/export/player-wiki");
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

  async startIdeation(params: StartIdeationParams): Promise<IdeationStartResponse> {
    return this.postJson<IdeationStartResponse>("/ideation/start", params);
  }

  async respondToIdeation(
    sessionId: string,
    params: RespondToIdeationParams,
  ): Promise<IdeationRespondResponse> {
    return this.postJson<IdeationRespondResponse>(
      `/ideation/${encodeURIComponent(sessionId)}/respond`,
      params,
    );
  }

  async proposeFacts(params: ProposeFactsParams): Promise<ProposeFactsResponse> {
    return this.postJson<ProposeFactsResponse>("/propose-facts", params);
  }

  async capture(params: CaptureParams): Promise<CaptureResponse> {
    return this.postJson<CaptureResponse>("/capture", params);
  }

  async unprocessedBrainstorm(): Promise<UnprocessedBrainstormResponse> {
    return this.getJson<UnprocessedBrainstormResponse>("/unprocessed-brainstorm");
  }

  async listCultures(): Promise<CulturesResponse> {
    return this.getJson<CulturesResponse>("/name/cultures");
  }

  async suggestNames(params: SuggestNamesParams): Promise<NameSuggestResponse> {
    return this.postJson<NameSuggestResponse>("/name/suggest", params);
  }

  async listInbox(): Promise<InboxResponse> {
    return this.getJson<InboxResponse>("/inbox");
  }

  async triageSuggest(params: TriageSuggestParams): Promise<TriageSuggestResponse> {
    return this.postJson<TriageSuggestResponse>("/triage-suggest", params);
  }

  async unlinkedMentions(params: UnlinkedMentionsParams): Promise<UnlinkedMentionsResponse> {
    const qs = new URLSearchParams();
    qs.set("file", params.file);
    return this.getJson<UnlinkedMentionsResponse>(`/unlinked-mentions?${qs.toString()}`);
  }

  async planEntityRename(oldName: string, params: PlanEntityRenameParams): Promise<RenamePlan> {
    return this.postJson<RenamePlan>(
      `/entity/${encodeURIComponent(oldName)}/rename`,
      params,
    );
  }

  async timeline(): Promise<TimelineResponse> {
    return this.getJson<TimelineResponse>("/timeline");
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
          const d = payload.detail;
          throw new LlmUnavailableError(
            `llm_unavailable: ${d.reason ?? "no reason"}`,
            d.code ?? "unknown",
            d.hint ?? "",
            d.reason ?? "",
          );
        }
        if (payload?.detail) detail = JSON.stringify(payload.detail);
      } catch (jsonErr) {
        if (jsonErr instanceof LlmUnavailableError) {
          throw jsonErr;
        }
        // fall through with the status detail
      }
      throw new Error(`sidecar request failed: ${path} (${detail})`);
    }
    return (await res.json()) as T;
  }
}
