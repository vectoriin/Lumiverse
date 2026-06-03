import { getSession, updateSession } from "./session.service";
import { getBible } from "./bible.service";
import { getFields } from "./render.service";
import { FIELD_IDS, getField as getFieldDef } from "./fields";
import { ensureWeaverPreset } from "./governance-preset";
import * as charactersSvc from "../characters.service";
import * as chatsSvc from "../chats.service";
import type { Character, CreateCharacterInput } from "../../types/character";
import type { Chat } from "../../types/chat";
import type { WeaverBibleSpine, WeaverField } from "../../types/weaver";

const WEAVER_CREATOR = "Lumiverse Weaver";
const WEAVER_TAG = "weaver";

const WEAVER_EXTENSION_SCHEMA = 1;

const WEAVER_EXTENSION_SLOTS: readonly string[] = [
  "archetype",
  "form",
  "gradient",
  "tensions",
  "intents",
  "negative_space",
  "relational_axis",
  "intimacy",
];

function isFieldReady(field: WeaverField | undefined): boolean {
  if (!field || !field.content.trim()) return false;
  return field.status === "passed" || field.status === "manually_edited" || field.provenance.accepted === true;
}

function slotContent(spine: WeaverBibleSpine, slot: string): string {
  return spine.entries.find((e) => e.slot === slot)?.content.trim() ?? "";
}

function compactLine(text: string, max = 240): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

function buildReanchorEntry(name: string, spine: WeaverBibleSpine): Record<string, unknown> {
  const core = compactLine(slotContent(spine, "archetype") || slotContent(spine, "central_contradiction") || spine.brief);
  const drives = compactLine(slotContent(spine, "intents") || slotContent(spine, "values"));
  const voice = compactLine(slotContent(spine, "voice"));
  const axis = slotContent(spine, "relational_axis");
  const now = axis ? compactLine(`${axis} (baseline)`) : "baseline";

  const lines = [
    `Core: ${core}`,
    drives ? `Drives: ${drives}` : "",
    voice ? `Voice: ${voice}` : "",
    `Now: ${now}`,
  ].filter(Boolean);

  return {
    keys: [name].filter(Boolean),
    content: lines.join("\n"),
    comment: "Weaver re-anchor",
    constant: true,
    enabled: true,
    insertion_order: 0,
    position: "before_char",
    depth: 4,
    role: "system",
    case_sensitive: false,
  };
}

function buildWeaverExtension(sessionId: string, spine: WeaverBibleSpine): Record<string, unknown> {
  const structured: Record<string, { content: string; parts?: unknown }> = {};
  for (const slot of WEAVER_EXTENSION_SLOTS) {
    const entry = spine.entries.find((e) => e.slot === slot);
    if (!entry || !entry.content.trim()) continue;
    structured[slot] = entry.parts ? { content: entry.content, parts: entry.parts } : { content: entry.content };
  }
  return {
    schema: WEAVER_EXTENSION_SCHEMA,
    source: "weaver",
    session_id: sessionId,
    structured,
  };
}

export interface WeaverFinalizeResult {
  character: Character;
  preset_id: string;
}

export interface WeaverStartChatResult {
  chat: Chat;
  preset_id: string;
}

export function finalizeSession(userId: string, sessionId: string): WeaverFinalizeResult {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");

  const bible = getBible(userId, sessionId);
  if (!bible || bible.spine.entries.length === 0) {
    throw new Error("Synthesize a Bible first — there is nothing to finalize from");
  }

  const fields = getFields(userId, sessionId);
  const byName = new Map(fields.map((f) => [f.field_name, f]));

  const notReady = FIELD_IDS.filter((id) => !isFieldReady(byName.get(id)));
  if (notReady.length > 0) {
    const labels = notReady.map((id) => getFieldDef(id)?.label ?? id).join(", ");
    throw new Error(`Render and accept every field before finalizing — still pending: ${labels}`);
  }

  const fieldContent = (id: string) => byName.get(id)!.content.trim();
  const name = fieldContent("name");

  const input: CreateCharacterInput = {
    name,
    description: fieldContent("description"),
    personality: fieldContent("personality"),
    scenario: fieldContent("scenario"),
    first_mes: fieldContent("first_mes"),
    mes_example: fieldContent("mes_example"),
    system_prompt: "",
    post_history_instructions: "",
    creator: WEAVER_CREATOR,
    creator_notes: "Authored with the Lumiverse Weaver. Pairs with the Lumiverse Weaver governance preset.",
    tags: [WEAVER_TAG],
    alternate_greetings: [],
    extensions: {
      character_book: { entries: [buildReanchorEntry(name, bible.spine)] },
      weaver: buildWeaverExtension(sessionId, bible.spine),
    },
  };

  const character = charactersSvc.createCharacter(userId, input);
  const preset = ensureWeaverPreset(userId);

  updateSession(userId, sessionId, {
    stage: "finalize",
    status: "finalized",
    character_id: character.id,
  });

  return { character, preset_id: preset.id };
}

export function startChat(userId: string, sessionId: string): WeaverStartChatResult {
  const session = getSession(userId, sessionId);
  if (!session) throw new Error("Session not found");
  if (!session.character_id) throw new Error("Finalize the card first — there is nothing to start a chat with");

  const preset = ensureWeaverPreset(userId);
  const chat = chatsSvc.createChat(userId, { character_id: session.character_id });
  updateSession(userId, sessionId, { launch_chat_id: chat.id });

  return { chat, preset_id: preset.id };
}
