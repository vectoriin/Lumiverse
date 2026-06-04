import { get, post, patch, del } from './client'
import type { Character, Chat } from '@/types/api'

const LLM_CALL = { timeout: 0 } as const

export type WeaverStage =
  | 'dream'
  | 'readback'
  | 'interview'
  | 'bible'
  | 'render'
  | 'finalize'

export type WeaverSessionStatus =
  | 'draft'
  | 'interviewing'
  | 'bible'
  | 'rendering'
  | 'finalized'

export interface WeaverSeed {
  type: string
  text: string
  provenance: Record<string, unknown>
}

export interface WeaverSession {
  id: string
  user_id: string
  session_number: number
  created_at: number
  updated_at: number
  seed: WeaverSeed
  stage: WeaverStage
  status: WeaverSessionStatus
  connection_id: string | null
  model: string | null
  persona_id: string | null
  character_id: string | null
  launch_chat_id: string | null
  interview_started_at: number | null
  interview_completed_at: number | null
}

export interface CreateWeaverSessionInput {
  seed_type?: string
  seed_text?: string
  seed_provenance?: Record<string, unknown>
  connection_id?: string
  model?: string
  persona_id?: string
}

export interface UpdateWeaverSessionInput {
  seed_text?: string
  stage?: WeaverStage
  status?: WeaverSessionStatus
  connection_id?: string | null
  model?: string | null
  persona_id?: string | null
}

export function createSession(input: CreateWeaverSessionInput = {}): Promise<WeaverSession> {
  return post<WeaverSession>('/weaver/sessions', input)
}

export function listSessions(): Promise<WeaverSession[]> {
  return get<WeaverSession[]>('/weaver/sessions')
}

export function getSession(id: string): Promise<WeaverSession> {
  return get<WeaverSession>(`/weaver/sessions/${id}`)
}

export function updateSession(
  id: string,
  input: UpdateWeaverSessionInput,
): Promise<WeaverSession> {
  return patch<WeaverSession>(`/weaver/sessions/${id}`, input)
}

export function deleteSession(id: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/weaver/sessions/${id}`)
}

export interface WeaverVisualKindMeta {
  id: string
  width: number
  height: number
  aspect_ratio: string
  base_negative: string
}

export interface WeaverVisualJobProgress {
  stage: string
  message: string
  step?: number
  totalSteps?: number
  preview?: string
  nodeId?: string
}

export interface WeaverVisualJobResult {
  image_id?: string
  image_url?: string
  settingsSnapshot: Record<string, unknown>
}

export type WeaverVisualJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface WeaverVisualJob {
  id: string
  userId: string
  sessionId: string
  characterId: string
  kind: string
  variant: string | null
  connectionId: string
  status: WeaverVisualJobStatus
  progress: WeaverVisualJobProgress
  result: WeaverVisualJobResult | null
  error: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface WeaverVisualGenerateInput {
  kind: string
  prompt: string
  connection_id: string
  negative_prompt?: string
  width?: number
  height?: number
  aspect_ratio?: string
  seed?: number | null
  variant?: string
  provider_state?: Record<string, unknown>
}

/** A staged candidate image (owned by the character, uncommitted). */
export interface WeaverVisualCandidate {
  id: string
  url: string
  width: number | null
  height: number | null
  created_at?: number
}

export function getVisualKinds(): Promise<WeaverVisualKindMeta[]> {
  return get<WeaverVisualKindMeta[]>('/weaver/visual/kinds')
}

export function generateVisual(sessionId: string, input: WeaverVisualGenerateInput): Promise<WeaverVisualJob> {
  return post<WeaverVisualJob>(`/weaver/sessions/${sessionId}/visual/generate`, input)
}

export function getVisualJob(sessionId: string, jobId: string): Promise<WeaverVisualJob> {
  return get<WeaverVisualJob>(`/weaver/sessions/${sessionId}/visual/job/${jobId}`)
}

export function listVisualCandidates(
  sessionId: string,
  kind: string,
): Promise<{ data: WeaverVisualCandidate[]; total: number }> {
  return get<{ data: WeaverVisualCandidate[]; total: number }>(
    `/weaver/sessions/${sessionId}/visual/candidates`,
    { kind },
  )
}

export function commitAvatar(sessionId: string, imageId: string): Promise<Character> {
  return post<Character>(`/weaver/sessions/${sessionId}/visual/commit/avatar`, { image_id: imageId })
}

export function suggestVisualTags(sessionId: string): Promise<{ suggestedTags: string; suggestedNegativeTags: string }> {
  return post<{ suggestedTags: string; suggestedNegativeTags: string }>(
    `/weaver/sessions/${sessionId}/visual/suggest-tags`,
    {},
    LLM_CALL,
  )
}

export type WeaverSlotImpact = 'critical' | 'high' | 'medium' | 'low'
export type WeaverSlotFill = 'elicit' | 'generate'

export interface WeaverSpinePart {
  id: string
  label: string
  fill: WeaverSlotFill
  description?: string
}

export interface WeaverSpineSlot {
  id: string
  category: string
  label: string
  description: string
  impact: WeaverSlotImpact
  fill: WeaverSlotFill
  parts?: WeaverSpinePart[]
  optional?: boolean
}

export interface WeaverCommittedFact {
  slot: string
  part?: string
  fact: string
  source: 'extracted' | 'user'
}

export interface WeaverGap {
  slot: string
  note: string
  source: 'extracted' | 'user'
}

export interface WeaverExtraction {
  session_id: string
  committed_facts: WeaverCommittedFact[]
  gaps: WeaverGap[]
  edited_at: number
}

export function getSlots(): Promise<WeaverSpineSlot[]> {
  return get<WeaverSpineSlot[]>('/weaver/slots')
}

export function getExtraction(sessionId: string): Promise<WeaverExtraction> {
  return get<WeaverExtraction>(`/weaver/sessions/${sessionId}/extraction`)
}

export function runReadback(sessionId: string): Promise<WeaverExtraction> {
  return post<WeaverExtraction>(`/weaver/sessions/${sessionId}/readback`, {}, LLM_CALL)
}

export function updateExtraction(
  sessionId: string,
  input: { committed_facts?: WeaverCommittedFact[]; gaps?: WeaverGap[] },
): Promise<WeaverExtraction> {
  return patch<WeaverExtraction>(`/weaver/sessions/${sessionId}/extraction`, input)
}

export type WeaverResponseKind = 'pick' | 'blend' | 'redirect' | 'typed' | 'inferred'

export interface WeaverAxisOption {
  caption: string
  content: string
}

export interface WeaverAxis {
  name: string
  description: string
}

export interface WeaverElicitTarget {
  slot: string
  part: string
  label: string
}

export interface WeaverQuestion {
  slot: string
  part: string
  axis: WeaverAxis
  options: WeaverAxisOption[]
}

export interface WeaverInterviewTurn {
  id: string
  session_id: string
  seq: number
  slot: string
  part: string
  axis: WeaverAxis
  response_kind: WeaverResponseKind
  response: string
  created_at: number
}

export type WeaverInterviewPhase = 'pending' | 'active' | 'complete'

export interface WeaverInterviewState {
  phase: WeaverInterviewPhase
  answered: WeaverInterviewTurn[]
  remaining_targets: WeaverElicitTarget[]
  no_gaps_remaining: boolean
}

export function getInterviewState(sessionId: string): Promise<WeaverInterviewState> {
  return get<WeaverInterviewState>(`/weaver/sessions/${sessionId}/interview`)
}

export function generateQuestion(
  sessionId: string,
  input: { steer?: string; avoid?: string[] } = {},
): Promise<{ question: WeaverQuestion | null }> {
  return post<{ question: WeaverQuestion | null }>(
    `/weaver/sessions/${sessionId}/interview/question`,
    input,
    LLM_CALL,
  )
}

export function answerQuestion(
  sessionId: string,
  input: {
    slot: string
    part: string
    axis: WeaverAxis
    kind: WeaverResponseKind
    content: string
    steer?: string
  },
): Promise<WeaverInterviewState> {
  return post<WeaverInterviewState>(`/weaver/sessions/${sessionId}/interview/answer`, input)
}

export function resetInterview(sessionId: string): Promise<WeaverInterviewState> {
  return post<WeaverInterviewState>(`/weaver/sessions/${sessionId}/interview/reset`, {})
}

export function beginInterview(sessionId: string): Promise<WeaverInterviewState> {
  return post<WeaverInterviewState>(`/weaver/sessions/${sessionId}/interview/begin`, {})
}

export function completeInterview(sessionId: string): Promise<WeaverInterviewState> {
  return post<WeaverInterviewState>(`/weaver/sessions/${sessionId}/interview/complete`, {})
}

export type WeaverBibleOrigin = 'established' | 'authored' | 'inferred'
export type WeaverBibleStatus = 'pending' | 'gated' | 'flagged'

export interface WeaverBibleEntryPart {
  id: string
  content: string
  origin: WeaverBibleOrigin
}

export interface WeaverBibleEntry {
  slot: string
  content: string
  origin: WeaverBibleOrigin
  parts?: WeaverBibleEntryPart[]
}

export interface WeaverBibleCausalLink {
  from: string
  to: string
  relation: string
}

export interface WeaverBibleSpine {
  entries: WeaverBibleEntry[]
  causal_links: WeaverBibleCausalLink[]
  brief: string
}

export interface WeaverGateCriterion {
  key: string
  label: string
  passed: boolean
  note: string
}

export interface WeaverGateVerdict {
  passed: boolean
  criteria: WeaverGateCriterion[]
  summary: string
}

export interface WeaverTokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  calls: number
}

export interface WeaverBible {
  session_id: string
  spine: WeaverBibleSpine
  status: WeaverBibleStatus
  gate: WeaverGateVerdict | null
  token_usage: WeaverTokenUsage
  gated_at: number | null
  updated_at: number | null
}

export interface UpdateWeaverBibleInput {
  entries?: WeaverBibleEntry[]
  causal_links?: WeaverBibleCausalLink[]
  brief?: string
}

export function getBible(sessionId: string): Promise<WeaverBible> {
  return get<WeaverBible>(`/weaver/sessions/${sessionId}/bible`)
}

export function synthesizeBible(sessionId: string): Promise<WeaverBible> {
  return post<WeaverBible>(`/weaver/sessions/${sessionId}/bible/synthesize`, {}, LLM_CALL)
}

export function gateBible(sessionId: string): Promise<WeaverBible> {
  return post<WeaverBible>(`/weaver/sessions/${sessionId}/bible/gate`, {}, LLM_CALL)
}

export function updateBible(
  sessionId: string,
  input: UpdateWeaverBibleInput,
): Promise<WeaverBible> {
  return patch<WeaverBible>(`/weaver/sessions/${sessionId}/bible`, input)
}

export type WeaverFieldKind = 'short' | 'bundle' | 'voice' | 'scene' | 'voiced' | 'alichat'
export type WeaverFieldRender = 'synthesize' | 'direct'

export interface WeaverFieldDef {
  id: string
  label: string
  charlField: string
  order: number
  kind: WeaverFieldKind
  render: WeaverFieldRender
  directSlot?: string
  primarySlots: string[]
  renderGuidance: string
}

export type WeaverFieldStatus =
  | 'pending'
  | 'streaming'
  | 'passed'
  | 'flagged'
  | 'stale'
  | 'manually_edited'

export interface WeaverFieldProvenance {
  bible_gated_at: number | null
  bible_updated_at: number | null
  bible_status: WeaverBibleStatus
  gate: WeaverGateVerdict | null
  revised: boolean
  bible_spine_hash?: string | null
  accepted?: boolean
  nudge?: string
}

export interface WeaverField {
  id: string
  session_id: string
  field_name: string
  content: string
  status: WeaverFieldStatus
  provenance: WeaverFieldProvenance
  token_usage: WeaverTokenUsage
  updated_at: number
  stale?: boolean
}

export function getFieldDefs(): Promise<WeaverFieldDef[]> {
  return get<WeaverFieldDef[]>('/weaver/field-defs')
}

export function getFields(sessionId: string): Promise<WeaverField[]> {
  return get<WeaverField[]>(`/weaver/sessions/${sessionId}/fields`)
}

export function renderFields(sessionId: string): Promise<WeaverField[]> {
  return post<WeaverField[]>(`/weaver/sessions/${sessionId}/fields/render`, {}, LLM_CALL)
}

export function renderField(sessionId: string, fieldId: string, force = false): Promise<WeaverField> {
  return post<WeaverField>(`/weaver/sessions/${sessionId}/fields/${fieldId}/render`, force ? { force: true } : {}, LLM_CALL)
}

export function editField(sessionId: string, fieldId: string, content: string): Promise<WeaverField> {
  return patch<WeaverField>(`/weaver/sessions/${sessionId}/fields/${fieldId}`, { content })
}

export function acceptField(sessionId: string, fieldId: string, accepted: boolean): Promise<WeaverField> {
  return post<WeaverField>(`/weaver/sessions/${sessionId}/fields/${fieldId}/accept`, { accepted })
}

export function nudgeField(sessionId: string, fieldId: string, nudge: string, force = false): Promise<WeaverField> {
  return post<WeaverField>(
    `/weaver/sessions/${sessionId}/fields/${fieldId}/nudge`,
    force ? { nudge, force: true } : { nudge },
    LLM_CALL,
  )
}

export interface WeaverFinalizeResult {
  character: Character
}

export interface WeaverStartChatResult {
  chat: Chat
}

export function finalizeSession(sessionId: string): Promise<WeaverFinalizeResult> {
  return post<WeaverFinalizeResult>(`/weaver/sessions/${sessionId}/finalize`, {})
}

export function startChat(sessionId: string): Promise<WeaverStartChatResult> {
  return post<WeaverStartChatResult>(`/weaver/sessions/${sessionId}/start-chat`, {})
}
