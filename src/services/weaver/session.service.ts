import { getDb } from "../../db/connection";
import type {
  WeaverSession,
  CreateWeaverSessionInput,
  UpdateWeaverSessionInput,
  WeaverStage,
  WeaverSessionStatus,
} from "../../types/weaver";

const VALID_STAGES: readonly WeaverStage[] = [
  "dream",
  "readback",
  "interview",
  "bible",
  "render",
  "finalize",
];

const VALID_STATUSES: readonly WeaverSessionStatus[] = [
  "draft",
  "interviewing",
  "bible",
  "rendering",
  "finalized",
];

function rowToSession(row: any): WeaverSession {
  const sessionNumber = Number(row.session_number);
  return {
    id: row.id,
    user_id: row.user_id,
    session_number: Number.isFinite(sessionNumber) ? sessionNumber : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    seed: {
      type: row.seed_type || "dream",
      text: row.seed_text ?? "",
      provenance: parseJsonObject(row.seed_provenance),
    },
    stage: VALID_STAGES.includes(row.stage) ? row.stage : "dream",
    status: VALID_STATUSES.includes(row.status) ? row.status : "draft",
    connection_id: row.connection_id ?? null,
    model: row.model ?? null,
    persona_id: row.persona_id ?? null,
    character_id: row.character_id ?? null,
    launch_chat_id: row.launch_chat_id ?? null,
    interview_started_at: row.interview_started_at ?? null,
    interview_completed_at: row.interview_completed_at ?? null,
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function nextSessionNumber(userId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(MAX(session_number), 0) + 1 AS next
         FROM weaver_sessions
        WHERE user_id = ?`,
    )
    .get(userId) as { next: number };
  return row.next;
}

export function createSession(
  userId: string,
  input: CreateWeaverSessionInput = {},
): WeaverSession {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const sessionNumber = nextSessionNumber(userId);

  db.prepare(
    `INSERT INTO weaver_sessions (
       id, user_id, session_number, created_at, updated_at,
       seed_type, seed_text, seed_provenance,
       connection_id, model, persona_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    sessionNumber,
    now,
    now,
    input.seed_type?.trim() || "dream",
    input.seed_text ?? "",
    JSON.stringify(input.seed_provenance ?? {}),
    normalizeOptionalText(input.connection_id),
    normalizeOptionalText(input.model),
    normalizeOptionalText(input.persona_id),
  );

  return getSession(userId, id)!;
}

export function getSession(userId: string, sessionId: string): WeaverSession | null {
  const row = getDb()
    .prepare(`SELECT * FROM weaver_sessions WHERE id = ? AND user_id = ?`)
    .get(sessionId, userId) as any;
  return row ? rowToSession(row) : null;
}

export function listSessions(userId: string): WeaverSession[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM weaver_sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC`,
    )
    .all(userId) as any[];
  return rows.map(rowToSession);
}

export function updateSession(
  userId: string,
  sessionId: string,
  input: UpdateWeaverSessionInput,
): WeaverSession {
  const existing = getSession(userId, sessionId);
  if (!existing) throw new Error("Session not found");

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if ("seed_text" in input) {
    updates.push("seed_text = ?");
    params.push(input.seed_text ?? "");
  }
  if ("stage" in input && input.stage) {
    if (!VALID_STAGES.includes(input.stage)) throw new Error("Invalid stage");
    updates.push("stage = ?");
    params.push(input.stage);
  }
  if ("status" in input && input.status) {
    if (!VALID_STATUSES.includes(input.status)) throw new Error("Invalid status");
    updates.push("status = ?");
    params.push(input.status);
  }
  if ("connection_id" in input) {
    updates.push("connection_id = ?");
    params.push(normalizeOptionalText(input.connection_id));
  }
  if ("model" in input) {
    updates.push("model = ?");
    params.push(normalizeOptionalText(input.model));
  }
  if ("persona_id" in input) {
    updates.push("persona_id = ?");
    params.push(normalizeOptionalText(input.persona_id));
  }
  if ("character_id" in input) {
    updates.push("character_id = ?");
    params.push(normalizeOptionalText(input.character_id));
  }
  if ("launch_chat_id" in input) {
    updates.push("launch_chat_id = ?");
    params.push(normalizeOptionalText(input.launch_chat_id));
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(sessionId, userId);

  getDb()
    .prepare(`UPDATE weaver_sessions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...params);

  return getSession(userId, sessionId)!;
}

/** Explicit stage transition helper — stage changes are first-class (plan #24). */
export function setStage(
  userId: string,
  sessionId: string,
  stage: WeaverStage,
): WeaverSession {
  return updateSession(userId, sessionId, { stage });
}

export function deleteSession(userId: string, sessionId: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM weaver_sessions WHERE id = ? AND user_id = ?`)
    .run(sessionId, userId);
  return result.changes > 0;
}
