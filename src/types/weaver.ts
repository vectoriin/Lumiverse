export type WeaverStage =
  | "dream"
  | "readback"
  | "interview"
  | "bible"
  | "render"
  | "finalize";

export type WeaverSessionStatus =
  | "draft"
  | "interviewing"
  | "bible"
  | "rendering"
  | "finalized";

export interface WeaverSeed {
  type: string;
  text: string;
  provenance: Record<string, unknown>;
}

export interface WeaverSession {
  id: string;
  user_id: string;
  session_number: number;
  created_at: number;
  updated_at: number;

  seed: WeaverSeed;

  stage: WeaverStage;
  status: WeaverSessionStatus;

  connection_id: string | null;
  model: string | null;
  persona_id: string | null;

  character_id: string | null;
  launch_chat_id: string | null;

  interview_started_at: number | null;
  interview_completed_at: number | null;
}

export interface CreateWeaverSessionInput {
  seed_type?: string;
  seed_text?: string;
  seed_provenance?: Record<string, unknown>;
  connection_id?: string;
  model?: string;
  persona_id?: string;
}

export interface UpdateWeaverSessionInput {
  seed_text?: string;
  stage?: WeaverStage;
  status?: WeaverSessionStatus;
  connection_id?: string | null;
  model?: string | null;
  persona_id?: string | null;
  character_id?: string | null;
  launch_chat_id?: string | null;
}

export interface WeaverCommittedFact {
  slot: string;
  part?: string;
  fact: string;
  source: "extracted" | "user";
}

export interface WeaverGap {
  slot: string;
  note: string;
  source: "extracted" | "user";
}

export interface WeaverExtraction {
  session_id: string;
  committed_facts: WeaverCommittedFact[];
  gaps: WeaverGap[];
  edited_at: number;
}

export interface WeaverExtractedMaterial {
  committed_facts: WeaverCommittedFact[];
  gaps: WeaverGap[];
  raw_source_text: string;
  provenance: Record<string, unknown>;
}

export interface UpdateWeaverExtractionInput {
  committed_facts?: WeaverCommittedFact[];
  gaps?: WeaverGap[];
}

export interface WeaverAxisOption {
  caption: string;
  content: string;
}

export interface WeaverAxis {
  name: string;
  description: string;
}

export interface WeaverElicitTarget {
  slot: string;
  part: string;
  label: string;
}

export interface WeaverQuestion {
  slot: string;
  part: string;
  axis: WeaverAxis;
  options: WeaverAxisOption[];
}

export type WeaverResponseKind = "pick" | "blend" | "redirect" | "typed" | "inferred";

export interface WeaverInterviewTurn {
  id: string;
  session_id: string;
  seq: number;
  slot: string;
  part: string;
  axis: WeaverAxis;
  response_kind: WeaverResponseKind;
  response: string;
  created_at: number;
}

export type WeaverInterviewPhase = "pending" | "active" | "complete";

export interface WeaverInterviewState {
  phase: WeaverInterviewPhase;
  answered: WeaverInterviewTurn[];
  remaining_targets: WeaverElicitTarget[];
  no_gaps_remaining: boolean;
}

export interface WeaverTasteProfile {
  steers: string[];
}

export interface GenerateQuestionInput {
  steer?: string;
  avoid?: string[];
}

export interface AnswerQuestionInput {
  slot: string;
  part: string;
  axis: WeaverAxis;
  kind: WeaverResponseKind;
  content: string;
  steer?: string;
}

export type WeaverBibleOrigin = "established" | "authored" | "inferred";

export interface WeaverBibleEntryPart {
  id: string;
  content: string;
  origin: WeaverBibleOrigin;
}

export interface WeaverBibleEntry {
  slot: string;
  content: string;
  origin: WeaverBibleOrigin;
  parts?: WeaverBibleEntryPart[];
}

export interface WeaverBibleCausalLink {
  from: string;
  to: string;
  relation: string;
}

export interface WeaverBibleSpine {
  entries: WeaverBibleEntry[];
  causal_links: WeaverBibleCausalLink[];
  brief: string;
}

export interface WeaverOcean {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  honesty_humility?: number;
}

export interface WeaverValueAnchor {
  value: string;
  anchor: string;
}

export interface WeaverGradientCraving {
  craving: string;
  aversion: string;
}

export interface WeaverGradient {
  wont: string[];
  neutral: string[];
  will: string[];
  craves: WeaverGradientCraving[];
  trust_gate: string;
}

export interface WeaverTension {
  condition: string;
  behavior: string;
}

export interface WeaverIntents {
  super_objective: string;
  obstacle: string;
  strategy: string;
}

export interface WeaverNegativeSpace {
  wont_say: string[];
  deflects: string[];
  tells_when_cornered: string[];
}

export type WeaverFormTier = string;

export interface WeaverFormBlock {
  tier: WeaverFormTier;
  dimensions: Record<string, string>;
  forward_details: string[];
  capability_limitation: string;
  presence: string;
}

export type WeaverAxisInertia = "ratchet" | "slow_revert" | "volatile";

export interface WeaverAxisWaypoint {
  level: "low" | "mid" | "high";
  mode: string;
  voice: string;
}

export interface WeaverAxisBandDelta {
  band: "wont" | "neutral" | "will" | "craves";
  from: string;
  to: string;
}

export interface WeaverRelationalAxis {
  variable: string;
  reads_from: string;
  inertia: WeaverAxisInertia;
  through_line: string;
  waypoints: WeaverAxisWaypoint[];
  band_deltas: WeaverAxisBandDelta[];
  foreshadowed_tell: string;
}

export type WeaverBibleStatus = "pending" | "gated" | "flagged";

export interface WeaverGateCriterion {
  key: string;
  label: string;
  passed: boolean;
  note: string;
}

export interface WeaverGateVerdict {
  passed: boolean;
  criteria: WeaverGateCriterion[];
  summary: string;
}

export interface WeaverTokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
}

export interface WeaverBible {
  session_id: string;
  spine: WeaverBibleSpine;
  status: WeaverBibleStatus;
  gate: WeaverGateVerdict | null;
  token_usage: WeaverTokenUsage;
  gated_at: number | null;
  updated_at: number | null;
}

export interface UpdateWeaverBibleInput {
  entries?: WeaverBibleEntry[];
  causal_links?: WeaverBibleCausalLink[];
  brief?: string;
}

export type WeaverFieldStatus =
  | "pending"
  | "streaming"
  | "passed"
  | "flagged"
  | "stale"
  | "manually_edited";

export interface WeaverFieldProvenance {
  bible_gated_at: number | null;
  bible_updated_at: number | null;
  bible_status: WeaverBibleStatus;
  gate: WeaverGateVerdict | null;
  revised: boolean;
  bible_spine_hash?: string | null;
  accepted?: boolean;
  nudge?: string;
}

export interface WeaverField {
  id: string;
  session_id: string;
  field_name: string;
  content: string;
  status: WeaverFieldStatus;
  provenance: WeaverFieldProvenance;
  token_usage: WeaverTokenUsage;
  updated_at: number;
  stale?: boolean;
}

export interface RenderFieldsInput {
  field_id?: string;
  force?: boolean;
}

export interface EditWeaverFieldInput {
  content: string;
}

export interface AcceptWeaverFieldInput {
  accepted: boolean;
}

export interface NudgeWeaverFieldInput {
  nudge: string;
  force?: boolean;
}

export type WeaverCardFieldId =
  | "name"
  | "description"
  | "personality"
  | "scenario"
  | "first_mes"
  | "mes_example"
  | "alternate_greetings"
  | "character_book";

export interface WeaverDescriptionSection {
  tag: string;
  body: string;
}

export interface WeaverAliChatExchange {
  coverage: string;
  text: string;
}

export interface WeaverCharacterBookAnchor {
  decorators: string[];
  core: string;
  drives: string;
  voice: string;
  now: string;
}

export interface WeaverCharacterBookLoreEntry {
  keys: string[];
  content: string;
  ignore_on_max_context: boolean;
}

export type WeaverVisualProvider =
  | "comfyui"
  | "novelai"
  | "nanogpt"
  | "google_gemini"
  | "sdapi"
  | "swarmui";

export interface WeaverVisualKindMeta {
  id: string;
  width: number;
  height: number;
  aspect_ratio: string;
  base_negative: string;
}

export interface WeaverVisualAsset {
  kind: string;
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  aspect_ratio: string;
  seed: number | null;
  provider: WeaverVisualProvider | null;
  provider_state: Record<string, unknown>;
  variant?: string;
}

export interface WeaverVisualGenerateInput {
  kind: string;
  prompt: string;
  connection_id: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  seed?: number | null;
  variant?: string;
  provider_state?: Record<string, unknown>;
}

export type WeaverVisualJobStatus = "queued" | "running" | "completed" | "failed";

export interface WeaverVisualJobProgress {
  stage: string;
  message: string;
  step?: number;
  totalSteps?: number;
  preview?: string;
  nodeId?: string;
}

export interface WeaverVisualJobResult {
  image_id?: string;
  image_url?: string;
  settingsSnapshot: Record<string, unknown>;
}

export interface WeaverVisualJob {
  id: string;
  userId: string;
  sessionId: string;
  characterId: string;
  kind: string;
  variant: string | null;
  connectionId: string;
  status: WeaverVisualJobStatus;
  progress: WeaverVisualJobProgress;
  result: WeaverVisualJobResult | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
}
