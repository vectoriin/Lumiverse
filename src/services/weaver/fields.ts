import { isSlotId } from "./slots";
import { buildDescriptionBundleGuidance } from "./description-sections";

export type WeaverFieldId =
  | "name"
  | "description"
  | "personality"
  | "scenario"
  | "first_mes"
  | "mes_example";

export type WeaverFieldKind = "short" | "bundle" | "voice" | "scene" | "voiced" | "alichat";

export type WeaverFieldRender = "synthesize" | "direct";

export interface WeaverFieldDef {
  id: WeaverFieldId;
  label: string;
  charlField: WeaverFieldId;
  order: number;
  kind: WeaverFieldKind;
  render: WeaverFieldRender;
  directSlot?: string;
  primarySlots: string[];
  renderGuidance: string;
}

export const FIELD_DEFS: readonly WeaverFieldDef[] = [
  {
    id: "name",
    label: "Name",
    charlField: "name",
    order: 1,
    kind: "short",
    render: "direct",
    directSlot: "name",
    primarySlots: ["name", "archetype", "central_contradiction"],
    renderGuidance:
      "The name carried directly from the Bible — already established, so it is not re-generated.",
  },
  {
    id: "description",
    label: "Description",
    charlField: "description",
    order: 2,
    kind: "bundle",
    render: "synthesize",
    primarySlots: [
      "archetype",
      "form",
      "values",
      "experiences",
      "central_contradiction",
      "tensions",
      "intents",
      "negative_space",
      "gradient",
    ],
    renderGuidance: buildDescriptionBundleGuidance(),
  },
  {
    id: "personality",
    label: "Personality",
    charlField: "personality",
    order: 3,
    kind: "voice",
    render: "synthesize",
    primarySlots: ["voice", "judgments", "central_contradiction", "negative_space"],
    renderGuidance:
      "Write the Voice & Language block: how this character actually sounds, compact and demonstrable. Cover register and dialect, sentence rhythm, characteristic lexicon and terms of address, the words they would never use, one or two verbal tics, and the physical mannerisms that go with the voice. Derive every point from the Bible's voice material so it coheres with the first message. Concrete and usable — a spec a writer could perform from, NOT a sample line of dialogue and NOT flowing prose paragraphs. No meta or preamble.",
  },
  {
    id: "scenario",
    label: "Scenario",
    charlField: "scenario",
    order: 4,
    kind: "scene",
    render: "synthesize",
    primarySlots: ["stance_toward_user", "intents", "central_contradiction"],
    renderGuidance:
      "Write the present situation that frames the first interaction — where this is, what is happening, and the charge in the air between the character and {{user}}, grounded in the character's stance toward {{user}} with the central tension live. This is a NEUTRAL stage frame written in the third person, not the character's first-person voice; do not narrate the character's first words here. End with a line beginning \"Scene-objective:\" stating what the character is trying to determine or achieve in this scene, drawn from their intents. No meta or preamble.",
  },
  {
    id: "first_mes",
    label: "First message",
    charlField: "first_mes",
    order: 5,
    kind: "voiced",
    render: "synthesize",
    primarySlots: ["voice", "stance_toward_user", "central_contradiction", "gradient"],
    renderGuidance:
      "Write the character's opening message to {{user}}, in their own voice, in the scenario's moment. The NARRATION must be in the character's first-person lens and idiolect (not a neutral third-person camera), and the dialogue must sound like this specific person (the Bible's voice material is the source of truth); reflect their stance toward {{user}} and let them act on an intent. Use {{user}} for the user and {{char}} for the character where natural; *italics* may carry inner thought. Do not write {{user}}'s actions or words. No meta or preamble.",
  },
  {
    id: "mes_example",
    label: "Example messages",
    charlField: "mes_example",
    order: 6,
    kind: "alichat",
    render: "synthesize",
    primarySlots: ["voice", "tensions", "gradient", "intents"],
    renderGuidance:
      "Write 3 to 5 example exchanges in the Ali:Chat convention. Begin each exchange with a line containing only \"<START>\", then a \"{{user}}:\" turn and a \"{{char}}:\" turn. Across the set, COVER varied and distinct beats: a peak emotional moment, a boundary the character holds, a moment of their humor, a value-driven choice, and a mundane everyday exchange — not the same register repeated. If the Bible carries a relational arc, also include one low-closeness and one high-closeness exchange that show the same through-line at different distances. Every {{char}} turn must be in the character's voice with first-person narration in their idiolect; *italics* may carry inner thought. Use {{user}} and {{char}}; do not write {{user}}'s lines beyond the short prompt that sets up each exchange. No meta or preamble.",
  },
] as const;

export const FIELD_IDS: readonly WeaverFieldId[] = FIELD_DEFS.map((f) => f.id);

export function getField(id: string): WeaverFieldDef | undefined {
  return FIELD_DEFS.find((f) => f.id === id);
}

export function isFieldId(id: unknown): id is WeaverFieldId {
  return typeof id === "string" && FIELD_IDS.includes(id as WeaverFieldId);
}

export function rankByOrder(): WeaverFieldDef[] {
  return [...FIELD_DEFS].sort((a, b) => a.order - b.order);
}

export function primarySlotsAreValid(): boolean {
  return FIELD_DEFS.every((f) => f.primarySlots.every((s) => isSlotId(s)));
}
