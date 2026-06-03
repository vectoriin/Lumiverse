import {
  DEFAULT_PRESET_BLOCKS,
  DEFAULT_PRESET_PARAMETERS,
  DEFAULT_PRESET_PROMPTS,
} from "../../auth/default-preset";
import * as presetsSvc from "../presets.service";
import type { Preset, CreatePresetInput } from "../../types/preset";

export const WEAVER_PRESET_SLUG = "lumiverse-weaver-governance";
export const WEAVER_PRESET_NAME = "Lumiverse Weaver";
export const WEAVER_PRESET_VERSION = "1";

interface PresetBlock {
  id: string;
  name: string;
  content: string;
  role: string;
  enabled: boolean;
  position: string;
  depth: number;
  marker: string | null;
  isLocked: boolean;
  color: string | null;
  injectionTrigger: string[];
  categoryMode: string | null;
}

function govBlock(id: string, name: string, content: string): PresetBlock {
  return {
    id,
    name,
    content,
    role: "system",
    enabled: true,
    position: "pre_history",
    depth: 0,
    marker: null,
    isLocked: false,
    color: null,
    injectionTrigger: [],
    categoryMode: null,
  };
}

const WEAVER_GOVERNANCE_BLOCKS: PresetBlock[] = [
  govBlock(
    "019e7000-0001-7000-9000-weaver0bind00",
    "Weaver · Deliberation & Bind",
    "<weaver_deliberation>\nBefore writing {{char}}'s next reply, work through this silently, then write only the reply:\n- BEAT: what just changed in the scene.\n- LENS: how {{char}} specifically perceives it, through their own values and voice.\n- STATE: where {{char}} is emotionally and relationally right now.\n- BODY: what {{char}}'s embodiment allows or prevents here — consult for spatial sense, never narrate as a list.\n- BIND: the value-conflict in play.\n- CALIBRATION: how strongly this lands for {{char}}.\n\nBIND: when {{char}} faces a conflict between two things they value, keep them inside it. Make them pay the cost of their choice rather than reframing the moment into an easier one or splitting the difference to dodge the tension. The contradiction is the character; do not resolve it away to be agreeable.\n\nCALIBRATION: react in proportion to what genuinely fits {{char}}. Respond strongly only to what actually moves them, and stay flat or unbothered toward what does not. The neutral, unmoved reactions are as load-bearing as the intense ones — a character who reacts to everything equally reads as generic.\n</weaver_deliberation>",
  ),
  govBlock(
    "019e7000-0002-7000-9000-weaver0craft0",
    "Weaver · Voice & anti-patterns",
    "<weaver_craft>\nNarrate in {{char}}'s own voice and lens, not a neutral camera: word choice, rhythm, and what gets noticed are all shaped by who {{char}} is. Keep dialogue in their idiolect.\n\nTreat physical and embodiment detail as a consult for spatial tracking, not material to recite — surface a detail only where the action makes it matter, never read appearance out like a spec sheet.\n\nDo not: use weather or a sigh as opening filler; restate {{user}}'s action back before responding; resolve tension quickly just to keep things comfortable; write {{user}}'s thoughts, words, or choices; flatten {{char}} into an accommodating version of themselves; or repeat an emotional beat in new words instead of advancing it.\n</weaver_craft>",
  ),
  govBlock(
    "019e7000-0003-7000-9000-weaver0axis00",
    "Weaver · Relational axis",
    "<weaver_axis>\nIf {{char}} has a relational axis (a state variable such as trust, attachment, or corruption that moves across the chat), read its current level from the re-anchor's Now line and the recent scene. Only the declared band-deltas shift with it; {{char}}'s hard limits never move at any level. Move the level gradually, in the direction the interaction earns, and let {{char}}'s mode and voice reflect the current level rather than jumping to an endpoint. If {{char}} has no such axis, ignore this.\n</weaver_axis>",
  ),
];

function weaverPresetMetadata(): Record<string, unknown> {
  return {
    source: null,
    modelProfiles: {},
    schemaVersion: 1,
    description:
      "Governance preset for Lumiverse Weaver characters: per-turn deliberation, the bind and calibration levers, voice and anti-pattern rules, and the relational-axis state-check. Pair it with any Weaver-authored card.",
    isDefault: false,
    promptVariables: {},
    _lumiverse_install_source: "weaver",
    _lumiverse_preset_slug: WEAVER_PRESET_SLUG,
    _lumiverse_preset_version: WEAVER_PRESET_VERSION,
    _lumiverse_preset_creator: "Lumiverse",
  };
}

export function buildWeaverPresetInput(): CreatePresetInput {
  const base = structuredClone(DEFAULT_PRESET_BLOCKS) as PresetBlock[];
  const sysIdx = base.findIndex((b) => b.name === "System Prompt");
  const insertAt = sysIdx >= 0 ? sysIdx + 1 : 0;
  const prompt_order = [
    ...base.slice(0, insertAt),
    ...structuredClone(WEAVER_GOVERNANCE_BLOCKS),
    ...base.slice(insertAt),
  ];

  return {
    name: WEAVER_PRESET_NAME,
    provider: "loom",
    engine: "classic",
    parameters: structuredClone(DEFAULT_PRESET_PARAMETERS),
    prompt_order,
    prompts: structuredClone(DEFAULT_PRESET_PROMPTS),
    metadata: weaverPresetMetadata(),
  };
}

export function ensureWeaverPreset(userId: string): Preset {
  const existing = presetsSvc.findPresetBySlug(userId, WEAVER_PRESET_SLUG);
  const input = buildWeaverPresetInput();
  if (existing) {
    const installedVersion = (existing.metadata as Record<string, unknown> | null)?._lumiverse_preset_version;
    if (installedVersion === WEAVER_PRESET_VERSION) return existing;
    return presetsSvc.updatePreset(userId, existing.id, input)!;
  }
  return presetsSvc.createPreset(userId, input);
}
