export type SlotImpact = "critical" | "high" | "medium" | "low";

export type SlotCategory = "identity" | "veja" | "keystone" | "relational" | "expression";

export type SlotFill = "elicit" | "generate";

export type SynthesisGroup = "psyche" | "disposition" | "presentation";

export interface SynthesisGroupDef {
  id: SynthesisGroup;
  label: string;
  instruction: string;
}

export const SYNTHESIS_GROUPS: readonly SynthesisGroupDef[] = [
  {
    id: "psyche",
    label: "Psyche",
    instruction:
      "the interior read — who this person is beneath behavior: the type they read as, the beliefs and heuristics and competencies that follow from their values and history, and the contradiction at their center.",
  },
  {
    id: "disposition",
    label: "Disposition",
    instruction:
      "the reactive engine — how that interior produces behavior: what they are ultimately after and how they pursue it, the situations that trigger signature reactions, how they calibrate across the reaction gradient, what they will not say, and (only if present) how they change as a bond deepens.",
  },
  {
    id: "presentation",
    label: "Presentation",
    instruction:
      "the surface — how the established interior and disposition actually manifest: their name, their embodiment as a consult-only reference, and above all how they sound.",
  },
] as const;

export interface SpinePart {
  id: string;
  label: string;
  fill: SlotFill;
  description?: string;
}

export interface SpineSlot {
  id: string;
  category: SlotCategory;
  label: string;
  description: string;
  impact: SlotImpact;
  fill: SlotFill;
  synthesisGroup: SynthesisGroup;
  parts?: readonly SpinePart[];
  optional?: boolean;
}

export const IMPACT_WEIGHT: Record<SlotImpact, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const SPINE_SLOTS: readonly SpineSlot[] = [
  {
    id: "name",
    synthesisGroup: "presentation",
    category: "identity",
    label: "Name",
    description:
      "What the character is called — a name that fits a real person from a real (or coherently invented) culture, not a trope or a role-label.",
    impact: "low",
    fill: "generate",
  },
  {
    id: "archetype",
    synthesisGroup: "psyche",
    category: "identity",
    label: "Archetype & core",
    description:
      "The recognizable type this character reads as at a glance, plus the one-line essence and silhouette that make them specific within it. The compact, re-injectable core (carries the internal psychometric read).",
    impact: "low",
    fill: "generate",
  },
  {
    id: "form",
    synthesisGroup: "presentation",
    category: "identity",
    label: "Form",
    description:
      "How they physically present, as a consultable reference: the body's tier (human through xeno), realistic and internally consistent proportions, the few forward details that matter, and above all what their body lets them do or prevents. Specific to this person, never a generic silhouette.",
    impact: "medium",
    fill: "generate",
  },
  {
    id: "values",
    synthesisGroup: "psyche",
    category: "veja",
    label: "Values",
    description:
      "What the character most wants and prioritizes, each tied to a concrete behavior that proves it (not a bare label) — the high-level motives that drive behavior across situations.",
    impact: "critical",
    fill: "elicit",
  },
  {
    id: "experiences",
    synthesisGroup: "psyche",
    category: "veja",
    label: "Experiences",
    description:
      "The charged formative events that forged those values — specific scenes that make the values believable rather than merely asserted, and trace where they lead.",
    impact: "critical",
    fill: "elicit",
  },
  {
    id: "judgments",
    synthesisGroup: "psyche",
    category: "veja",
    label: "Judgments",
    description:
      "Beliefs, opinions, and heuristics that follow from the character's values and experiences — how they read situations. The source of the IF-THEN signatures.",
    impact: "high",
    fill: "generate",
  },
  {
    id: "abilities",
    synthesisGroup: "psyche",
    category: "veja",
    label: "Abilities & limits",
    description:
      "What the character can and cannot do — competencies, domains of authority, and the limits that shape what they notice, attempt, or are bored by.",
    impact: "medium",
    fill: "generate",
  },
  {
    id: "central_contradiction",
    synthesisGroup: "psyche",
    category: "keystone",
    label: "Central contradiction",
    description:
      "The internal tension that keeps the character from being a single trait — two forces that genuinely pull against each other.",
    impact: "critical",
    fill: "elicit",
  },
  {
    id: "tensions",
    synthesisGroup: "disposition",
    category: "keystone",
    label: "Tensions",
    description:
      "The IF-THEN behavioral signatures that fall out of the contradiction and judgments — specific situations that trigger a specific reaction, making the character predictable in an interesting way.",
    impact: "high",
    fill: "generate",
  },
  {
    id: "stance_toward_user",
    synthesisGroup: "disposition",
    category: "relational",
    label: "Stance toward you",
    description:
      "How the character reads and treats someone like {{user}} — their default posture and attachment style in the relationship.",
    impact: "high",
    fill: "elicit",
  },
  {
    id: "intents",
    synthesisGroup: "disposition",
    category: "relational",
    label: "Intents",
    description:
      "What the character is ultimately after and how they pursue it against what stands in the way — the purpose that makes them an agent, not a reactive chatbot.",
    impact: "high",
    fill: "elicit",
    parts: [
      {
        id: "super_objective",
        label: "Super-objective",
        fill: "elicit",
        description: "The life-long want the character is ultimately chasing.",
      },
      {
        id: "obstacle",
        label: "Obstacle",
        fill: "generate",
        description: "What stands in the way of the super-objective.",
      },
      {
        id: "strategy",
        label: "Strategy",
        fill: "generate",
        description: "How the character pursues the objective against the obstacle.",
      },
    ],
  },
  {
    id: "voice",
    synthesisGroup: "presentation",
    category: "expression",
    label: "Voice",
    description:
      "How the character actually sounds — register and dialect, sentence rhythm, characteristic lexicon and terms of address, the words they would never use, and one or two verbal tics. The single most imitable signal; built first.",
    impact: "high",
    fill: "generate",
  },
  {
    id: "gradient",
    synthesisGroup: "disposition",
    category: "keystone",
    label: "Reaction gradient",
    description:
      "How the character calibrates reactions across four bands — what they will never do, what leaves them flat, what they engage once trust is earned, and what they actively crave (each paired with an aversion). The mechanism that keeps them from being uniformly agreeable.",
    impact: "critical",
    fill: "elicit",
    parts: [
      {
        id: "wont",
        label: "Hard limits",
        fill: "elicit",
        description: "What the character will never do — trust-invariant limits.",
      },
      {
        id: "craves",
        label: "Cravings",
        fill: "elicit",
        description: "What the character actively seeks out, each paired with what repels them.",
      },
      {
        id: "neutral",
        label: "Flat reactions",
        fill: "generate",
        description: "Topics that leave the character flat — load-bearing; breaks the always-eager default.",
      },
      {
        id: "will",
        label: "Engages on trust",
        fill: "generate",
        description: "What the character opens up to once trust is earned.",
      },
      {
        id: "trust_gate",
        label: "Trust gate",
        fill: "generate",
        description: "What raises or lowers trust and opens the engages-on-trust band.",
      },
    ],
  },
  {
    id: "relational_axis",
    synthesisGroup: "disposition",
    category: "relational",
    label: "Relational arc",
    description:
      "OPTIONAL. For a character who CHANGES as the bond deepens — the single through-line trait re-aimed across low/mid/high closeness, and the tell foreshadowed early. Present only when the seed shows real change over the relationship.",
    impact: "high",
    fill: "elicit",
    optional: true,
  },
  {
    id: "negative_space",
    synthesisGroup: "disposition",
    category: "expression",
    label: "Negative space",
    description:
      "What this specific character won't say, how they deflect when pressed, and the tells that leak when they are cornered.",
    impact: "medium",
    fill: "generate",
  },
  {
    id: "intimacy",
    synthesisGroup: "disposition",
    category: "relational",
    label: "Intimacy",
    description:
      "OPTIONAL, gated. The reaction calibration applied to desire and closeness — structural and grounded in values, never explicit. Present only for mature-flagged characters.",
    impact: "medium",
    fill: "elicit",
    optional: true,
    parts: [
      { id: "wont", label: "Hard limits", fill: "elicit", description: "Lines the character will never cross." },
      { id: "craves", label: "Cravings", fill: "elicit", description: "What they seek, each paired with its aversion." },
      { id: "neutral", label: "Flat", fill: "generate", description: "What leaves them unmoved." },
      { id: "will", label: "Opens to", fill: "generate", description: "What they engage with once close." },
    ],
  },
] as const;

export const SLOT_IDS: readonly string[] = SPINE_SLOTS.map((s) => s.id);

export function getSlot(id: string): SpineSlot | undefined {
  return SPINE_SLOTS.find((s) => s.id === id);
}

export function isSlotId(id: unknown): id is string {
  return typeof id === "string" && SLOT_IDS.includes(id);
}

export function slotSynthesisGroup(id: string): SynthesisGroup {
  return getSlot(id)?.synthesisGroup ?? SYNTHESIS_GROUPS[0].id;
}

export function rankByImpact(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => {
    const wa = IMPACT_WEIGHT[getSlot(a)?.impact ?? "low"];
    const wb = IMPACT_WEIGHT[getSlot(b)?.impact ?? "low"];
    return wb - wa;
  });
}

export function slotParts(id: string): SpinePart[] {
  const slot = getSlot(id);
  if (!slot) return [];
  if (slot.parts && slot.parts.length > 0) return [...slot.parts];
  return [{ id: slot.id, label: slot.label, fill: slot.fill }];
}

export function slotHasElicit(id: string): boolean {
  return slotParts(id).some((p) => p.fill === "elicit");
}

export function partFill(slotId: string, partId: string): SlotFill {
  const part = slotParts(slotId).find((p) => p.id === partId);
  return part?.fill ?? slotFill(slotId);
}

export function slotFill(id: string): SlotFill {
  if (!getSlot(id)) return "elicit";
  return slotHasElicit(id) ? "elicit" : "generate";
}
