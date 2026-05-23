// Mirrors the JSON shapes returned by the worldcanon sidecar.
// Keep this in sync with server/worldcanon/api.py.

export interface CorpusStat {
  name: string;
  chunk_count: number;
  last_indexed: number | null;
  chunker: string;
}

export interface StatsResponse {
  corpora: CorpusStat[];
  fact_count: number;
  relationship_count: number;
  rule_count: number;
  name_count: number;
  embedder: string;
}

export interface SearchHit {
  chunk_id: string;
  corpus: string;
  source_path: string;
  source_abs_path: string;
  title: string | null;
  body: string;
  metadata: Record<string, unknown>;
  score: number;
  match_source: "semantic" | "keyword" | "both";
}

export interface SearchResponse {
  results: SearchHit[];
}

export interface Fact {
  id: number;
  entity: string;
  claim: string;
  status: "canon" | "draft" | "retconned" | "proposed";
  introduced_in: string;
  chapter_index: number | null;
  source_file: string;
  created: number;
}

export interface Relationship {
  id: number;
  from_entity: string;
  with_entity: string;
  type: string;
  status: string;
  notes: string | null;
  source_file: string;
}

export interface EntityMention {
  chunk_id: string;
  corpus: string;
  source_path: string;
  body: string;
  mtime: number;
}

export interface EntityResponse {
  name: string;
  sheet: {
    source_path: string;
    title: string | null;
    body: string;
    metadata: Record<string, unknown>;
  };
  facts: Fact[];
  relationships: Relationship[];
  mentions: EntityMention[];
}

export type EntityType = "character" | "place" | "faction" | "item" | "event";

export interface AskResponse {
  answer: string;
  citations: string[];
  hits: SearchHit[];
}

export interface ContradictionFinding {
  entity: string;
  new_claim: string;
  conflicting_canon: string;
  reasoning: string;
}

export interface ContradictionResponse {
  findings: ContradictionFinding[];
}

export interface IdeationStartResponse {
  session_id: string;
  first_question: string;
}

export interface ProposedFact {
  claim: string;
  confidence: "high" | "medium" | "low";
}

export interface IdeationRespondResponse {
  proposed_facts: ProposedFact[];
  next_question: string | null;
}

export interface EntityProposedFact {
  entity: string;
  claim: string;
  confidence: "high" | "medium" | "low";
}

export interface ProposeFactsResponse {
  proposed_facts: EntityProposedFact[];
}

export interface CaptureResponse {
  status: "ok";
  path: string;
}

export interface UnprocessedBrainstormNote {
  source_path: string;
  preview: string;
  date: string | null;
  mtime: number;
}

export interface UnprocessedBrainstormResponse {
  notes: UnprocessedBrainstormNote[];
}

export interface CultureSummary {
  culture: string;
  used_count: number;
  candidate_count: number;
}

export interface CulturesResponse {
  cultures: CultureSummary[];
}

export interface NameSuggestion {
  name: string;
  reasoning: string;
}

export interface NameSuggestResponse {
  suggestions: NameSuggestion[];
}

export interface InboxItem {
  path: string;
  vault_path: string;
  preview: string;
  size: number;
}

export interface InboxResponse {
  items: InboxItem[];
}

export type TriageClassification =
  | "canon" | "drafts" | "research" | "discard"
  | "entities/characters" | "entities/places"
  | "entities/factions" | "entities/items" | "entities/events";

export interface TriageSuggestResponse {
  classification: TriageClassification;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}
