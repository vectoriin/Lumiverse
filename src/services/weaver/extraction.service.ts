import { getDb } from "../../db/connection";
import { getSession } from "./session.service";
import { getSeedAdapter } from "./seed-adapter";
import { isSlotId, slotParts } from "./slots";
import type {
  WeaverExtraction,
  WeaverCommittedFact,
  WeaverGap,
  UpdateWeaverExtractionInput,
} from "../../types/weaver";

function rowToExtraction(row: any): WeaverExtraction {
  return {
    session_id: row.session_id,
    committed_facts: parseFacts(row.committed_facts),
    gaps: parseGaps(row.gaps),
    edited_at: row.edited_at,
  };
}

function coercePart(slot: string, value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const v = value.trim();
  return slotParts(slot).some((p) => p.id === v) ? v : undefined;
}

function parseFacts(value: unknown): WeaverCommittedFact[] {
  const arr = safeParseArray(value);
  const out: WeaverCommittedFact[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const slot = (raw as any).slot;
    const fact = (raw as any).fact;
    if (!isSlotId(slot) || typeof fact !== "string" || !fact.trim()) continue;
    const source = (raw as any).source === "user" ? "user" : "extracted";
    const part = coercePart(slot, (raw as any).part);
    out.push({ slot, ...(part ? { part } : {}), fact: fact.trim(), source });
  }
  return out;
}

function parseGaps(value: unknown): WeaverGap[] {
  const arr = safeParseArray(value);
  const out: WeaverGap[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const slot = (raw as any).slot;
    if (!isSlotId(slot)) continue;
    const note = typeof (raw as any).note === "string" ? (raw as any).note.trim() : "";
    const source = (raw as any).source === "user" ? "user" : "extracted";
    out.push({ slot, note, source });
  }
  return out;
}

function safeParseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getExtraction(userId: string, sessionId: string): WeaverExtraction | null {
  const row = getDb()
    .prepare(`SELECT * FROM weaver_extraction WHERE session_id = ? AND user_id = ?`)
    .get(sessionId, userId) as any;
  return row ? rowToExtraction(row) : null;
}

function upsert(
  userId: string,
  sessionId: string,
  facts: WeaverCommittedFact[],
  gaps: WeaverGap[],
): WeaverExtraction {
  getDb()
    .prepare(
      `INSERT INTO weaver_extraction (session_id, user_id, committed_facts, gaps, edited_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(session_id) DO UPDATE SET
         committed_facts = excluded.committed_facts,
         gaps = excluded.gaps,
         edited_at = excluded.edited_at`,
    )
    .run(sessionId, userId, JSON.stringify(facts), JSON.stringify(gaps));
  return getExtraction(userId, sessionId)!;
}

export async function runReadback(
  userId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<WeaverExtraction> {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");

  const adapter = getSeedAdapter(session.seed.type);
  const material = await adapter.extract(userId, session, signal);

  const extraction = upsert(userId, sessionId, material.committed_facts, material.gaps);

  getDb()
    .prepare(
      `UPDATE weaver_sessions SET stage = 'readback', updated_at = unixepoch()
       WHERE id = ? AND user_id = ?`,
    )
    .run(sessionId, userId);

  return extraction;
}

export function addCommittedFact(
  userId: string,
  sessionId: string,
  slot: string,
  fact: string,
  part?: string,
): WeaverExtraction {
  const existing = getExtraction(userId, sessionId);
  if (!existing) throw new Error("Extraction not found");
  if (!isSlotId(slot)) throw new Error("Invalid slot");
  const trimmed = fact.trim();
  if (!trimmed) throw new Error("Fact is empty");
  const validPart = coercePart(slot, part);

  const facts: WeaverCommittedFact[] = [
    ...existing.committed_facts,
    { slot, ...(validPart ? { part: validPart } : {}), fact: trimmed, source: "user" },
  ];
  const gaps = allElicitPartsCovered(slot, facts)
    ? existing.gaps.filter((g) => g.slot !== slot)
    : existing.gaps;
  return upsert(userId, sessionId, facts, gaps);
}

function allElicitPartsCovered(slot: string, facts: WeaverCommittedFact[]): boolean {
  const parts = slotParts(slot);
  const hybrid = parts.length > 1;
  return parts
    .filter((p) => p.fill === "elicit")
    .every((p) => facts.some((f) => f.slot === slot && (hybrid ? f.part === p.id : true)));
}

export function revertSlotsToGaps(
  userId: string,
  sessionId: string,
  slots: string[],
): WeaverExtraction {
  const existing = getExtraction(userId, sessionId);
  if (!existing) throw new Error("Extraction not found");
  const revert = new Set(slots.filter(isSlotId));
  if (revert.size === 0) return existing;

  const facts = existing.committed_facts.filter((f) => !revert.has(f.slot));
  const gapSlots = new Set(existing.gaps.map((g) => g.slot));
  const gaps = [...existing.gaps];
  for (const slot of revert) {
    if (!gapSlots.has(slot)) gaps.push({ slot, note: "", source: "extracted" });
  }
  return upsert(userId, sessionId, facts, gaps);
}

export function updateExtraction(
  userId: string,
  sessionId: string,
  input: UpdateWeaverExtractionInput,
): WeaverExtraction {
  const existing = getExtraction(userId, sessionId);
  if (!existing) throw new Error("Extraction not found");

  const facts = (input.committed_facts ?? existing.committed_facts).map((f) => {
    const part = coercePart(f.slot, f.part);
    return {
      slot: f.slot,
      ...(part ? { part } : {}),
      fact: f.fact.trim(),
      source: "user" as const,
    };
  }).filter((f) => isSlotId(f.slot) && f.fact);

  const gaps = (input.gaps ?? existing.gaps).map((g) => ({
    slot: g.slot,
    note: (g.note ?? "").trim(),
    source: "user" as const,
  })).filter((g) => isSlotId(g.slot));

  return upsert(userId, sessionId, facts, gaps);
}
