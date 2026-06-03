import { getDb } from "../../db/connection";
import { getSession } from "./session.service";
import { getExtraction, addCommittedFact, revertSlotsToGaps } from "./extraction.service";
import { isSlotId, slotParts, slotHasElicit, getSlot, IMPACT_WEIGHT, SPINE_SLOTS } from "./slots";
import { weaverGenerateJson } from "./llm";
import {
  buildAxisSpreadPrompt,
  buildAxisSpreadUserMessage,
} from "./prompts";
import type {
  WeaverInterviewTurn,
  WeaverInterviewState,
  WeaverInterviewPhase,
  WeaverQuestion,
  WeaverElicitTarget,
  WeaverAxis,
  WeaverAxisOption,
  WeaverTasteProfile,
  WeaverResponseKind,
  WeaverCommittedFact,
  GenerateQuestionInput,
  AnswerQuestionInput,
} from "../../types/weaver";

const RESPONSE_KINDS: readonly WeaverResponseKind[] = ["pick", "blend", "redirect", "typed", "inferred"];

export function getTaste(userId: string): WeaverTasteProfile {
  const row = getDb()
    .prepare(`SELECT profile FROM weaver_taste WHERE user_id = ?`)
    .get(userId) as { profile?: string } | undefined;
  if (!row?.profile) return { steers: [] };
  try {
    const parsed = JSON.parse(row.profile);
    const steers = Array.isArray(parsed?.steers)
      ? parsed.steers.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    return { steers };
  } catch {
    return { steers: [] };
  }
}

const MAX_STEERS = 24;

export function addSteer(userId: string, steer: string): void {
  const trimmed = steer.trim();
  if (!trimmed) return;
  const taste = getTaste(userId);
  const steers = [...taste.steers.filter((s) => s !== trimmed), trimmed].slice(-MAX_STEERS);
  getDb()
    .prepare(
      `INSERT INTO weaver_taste (user_id, profile, updated_at)
       VALUES (?, ?, unixepoch())
       ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`,
    )
    .run(userId, JSON.stringify({ steers }));
}

function rowToTurn(row: any): WeaverInterviewTurn {
  const addr = typeof row.slot === "string" ? row.slot : "";
  const sep = addr.indexOf(":");
  const slot = sep >= 0 ? addr.slice(0, sep) : addr;
  const part = sep >= 0 ? addr.slice(sep + 1) : "";
  return {
    id: row.id,
    session_id: row.session_id,
    seq: row.seq,
    slot,
    part,
    axis: parseAxis(row.axis),
    response_kind: RESPONSE_KINDS.includes(row.response_kind) ? row.response_kind : "typed",
    response: typeof row.response === "string" ? safeText(row.response) : "",
    created_at: row.created_at,
  };
}

function parseAxis(value: unknown): WeaverAxis {
  if (typeof value !== "string") return { name: "", description: "" };
  try {
    const o = JSON.parse(value);
    return {
      name: typeof o?.name === "string" ? o.name : "",
      description: typeof o?.description === "string" ? o.description : "",
    };
  } catch {
    return { name: "", description: "" };
  }
}

function safeText(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object" && typeof parsed.content === "string") return parsed.content;
  } catch {
  }
  return value;
}

function listTurns(userId: string, sessionId: string): WeaverInterviewTurn[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM weaver_interview_turns
        WHERE session_id = ? AND user_id = ?
        ORDER BY seq ASC`,
    )
    .all(sessionId, userId) as any[];
  return rows.map(rowToTurn);
}

function nextSeq(sessionId: string): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM weaver_interview_turns WHERE session_id = ?`)
    .get(sessionId) as { next: number };
  return row.next;
}

function partCovered(facts: WeaverCommittedFact[], slot: string, part: string): boolean {
  const hybrid = slotParts(slot).length > 1;
  return facts.some((f) => f.slot === slot && (hybrid ? f.part === part : true));
}

function remainingTargets(userId: string, sessionId: string): WeaverElicitTarget[] {
  const extraction = getExtraction(userId, sessionId);
  if (!extraction) return [];
  const facts = extraction.committed_facts;
  const gapSlots = new Set(extraction.gaps.map((g) => g.slot));
  const targets: WeaverElicitTarget[] = [];
  for (const slot of SPINE_SLOTS) {
    if (!gapSlots.has(slot.id) || !slotHasElicit(slot.id)) continue;
    for (const p of slotParts(slot.id)) {
      if (p.fill !== "elicit") continue;
      if (!partCovered(facts, slot.id, p.id)) {
        targets.push({ slot: slot.id, part: p.id, label: p.label });
      }
    }
  }
  return targets.sort(
    (a, b) =>
      IMPACT_WEIGHT[getSlot(b.slot)?.impact ?? "low"] -
      IMPACT_WEIGHT[getSlot(a.slot)?.impact ?? "low"],
  );
}

function interviewPhase(session: { interview_started_at: number | null; interview_completed_at: number | null }): WeaverInterviewPhase {
  if (session.interview_completed_at) return "complete";
  if (session.interview_started_at) return "active";
  return "pending";
}

export function getInterviewState(userId: string, sessionId: string): WeaverInterviewState {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");
  const answered = listTurns(userId, sessionId);
  const remaining = remainingTargets(userId, sessionId);
  return {
    phase: interviewPhase(session),
    answered,
    remaining_targets: remaining,
    no_gaps_remaining: remaining.length === 0,
  };
}

export function beginInterview(userId: string, sessionId: string): WeaverInterviewState {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");
  if (!session.interview_started_at) {
    getDb()
      .prepare(
        `UPDATE weaver_sessions
            SET interview_started_at = unixepoch(), stage = 'interview', updated_at = unixepoch()
          WHERE id = ? AND user_id = ?`,
      )
      .run(sessionId, userId);
  }
  return getInterviewState(userId, sessionId);
}

export function completeInterview(userId: string, sessionId: string): WeaverInterviewState {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");
  getDb()
    .prepare(
      `UPDATE weaver_sessions
          SET interview_completed_at = unixepoch(),
              interview_started_at = COALESCE(interview_started_at, unixepoch()),
              updated_at = unixepoch()
        WHERE id = ? AND user_id = ?`,
    )
    .run(sessionId, userId);
  return getInterviewState(userId, sessionId);
}

function coerceOptions(value: unknown): WeaverAxisOption[] {
  if (!Array.isArray(value)) return [];
  const out: WeaverAxisOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const caption = (raw as any).caption;
    const content = (raw as any).content;
    if (typeof content !== "string" || !content.trim()) continue;
    out.push({
      caption: typeof caption === "string" ? caption.trim() : "",
      content: content.trim(),
    });
  }
  return out;
}

export async function generateQuestion(
  userId: string,
  sessionId: string,
  input: GenerateQuestionInput = {},
  signal?: AbortSignal,
): Promise<WeaverQuestion | null> {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");

  const remaining = remainingTargets(userId, sessionId);
  if (remaining.length === 0) return null;
  const target = remaining[0];

  const extraction = getExtraction(userId, sessionId)!;
  const taste = getTaste(userId);

  const hybrid = slotParts(target.slot).length > 1;
  const partDef = slotParts(target.slot).find((p) => p.id === target.part);
  const partFocus =
    hybrid && partDef ? { label: partDef.label, description: partDef.description } : undefined;

  if (!session.interview_started_at) {
    getDb()
      .prepare(
        `UPDATE weaver_sessions
            SET interview_started_at = unixepoch(), stage = 'interview', updated_at = unixepoch()
          WHERE id = ? AND user_id = ?`,
      )
      .run(sessionId, userId);
  }

  const obj = await weaverGenerateJson({
    userId,
    session,
    system: buildAxisSpreadPrompt(),
    user: buildAxisSpreadUserMessage({
      slot: target.slot,
      facts: extraction.committed_facts,
      taste,
      steer: input.steer,
      avoid: input.avoid,
      part: partFocus,
    }),
    temperature: 0.9,
    signal,
  });

  const axisRaw = obj.axis && typeof obj.axis === "object" ? (obj.axis as Record<string, unknown>) : {};
  const axis: WeaverAxis = {
    name: typeof axisRaw.name === "string" ? axisRaw.name : "",
    description: typeof axisRaw.description === "string" ? axisRaw.description : "",
  };
  const options = coerceOptions(obj.options);
  if (options.length === 0) throw new Error("The model returned no usable options");

  return { slot: target.slot, part: target.part, axis, options };
}

export function answerQuestion(
  userId: string,
  sessionId: string,
  input: AnswerQuestionInput,
): WeaverInterviewState {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");
  if (!isSlotId(input.slot)) throw new Error("Invalid slot");
  const content = input.content?.trim();
  if (!content) throw new Error("Answer is empty");
  const kind: WeaverResponseKind = RESPONSE_KINDS.includes(input.kind) ? input.kind : "typed";

  const part =
    input.part && input.part !== input.slot && slotParts(input.slot).some((p) => p.id === input.part)
      ? input.part
      : "";
  const addr = part && part !== input.slot ? `${input.slot}:${part}` : input.slot;

  const id = crypto.randomUUID();
  const seq = nextSeq(sessionId);
  getDb()
    .prepare(
      `INSERT INTO weaver_interview_turns
         (id, session_id, user_id, seq, slot, axis, response_kind, response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
    )
    .run(
      id,
      sessionId,
      userId,
      seq,
      addr,
      JSON.stringify(input.axis ?? { name: "", description: "" }),
      kind,
      JSON.stringify(content),
    );

  addCommittedFact(userId, sessionId, input.slot, content, part || undefined);

  if (input.steer && input.steer.trim()) addSteer(userId, input.steer);

  return getInterviewState(userId, sessionId);
}

export function resetInterview(userId: string, sessionId: string): WeaverInterviewState {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");

  const turns = listTurns(userId, sessionId);
  const slots = [...new Set(turns.map((t) => t.slot))];
  if (slots.length > 0) revertSlotsToGaps(userId, sessionId, slots);

  getDb()
    .prepare(`DELETE FROM weaver_interview_turns WHERE session_id = ? AND user_id = ?`)
    .run(sessionId, userId);

  getDb()
    .prepare(
      `UPDATE weaver_sessions
          SET interview_completed_at = NULL,
              interview_started_at = unixepoch(),
              stage = 'interview',
              updated_at = unixepoch()
        WHERE id = ? AND user_id = ?`,
    )
    .run(sessionId, userId);

  return getInterviewState(userId, sessionId);
}
