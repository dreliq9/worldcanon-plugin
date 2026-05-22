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
