import type { WeaverGateVerdict, WeaverGateCriterion, WeaverBibleSpine } from "../../types/weaver";

export interface GateCriterion {
  key: string;
  label: string;
  description: string;
  applies?: (spine: WeaverBibleSpine) => boolean;
}

function hasEntry(spine: WeaverBibleSpine, slot: string): boolean {
  return spine.entries.some((e) => e.slot === slot && e.content.trim().length > 0);
}

export const BIBLE_GATE_CRITERIA: readonly GateCriterion[] = [
  {
    key: "specificity",
    label: "Specificity",
    description:
      "The spine commits to concrete, particular choices — not generic traits or hedges that could describe almost anyone.",
  },
  {
    key: "coherence",
    label: "Coherence",
    description:
      "Values, experiences, and judgments connect causally — the character reads as one person whose parts explain each other, not a list of traits.",
  },
  {
    key: "tension",
    label: "Living tension",
    description:
      "The central contradiction is two forces that genuinely pull against each other — not a single trait restated, and not a flaw bolted on.",
  },
  {
    key: "originality",
    label: "Originality",
    description:
      "The character resists the statistical mean — it is not the first, most predictable thing a model would reach for given this premise.",
  },
  {
    key: "renderability",
    label: "Renderable",
    description:
      "There is enough specific, load-bearing material here to write distinct fields (description, voice, scenario) without inventing toward the average.",
  },
  {
    key: "calibration",
    label: "Calibration",
    description:
      "The reaction gradient is genuinely calibrated, not uniformly agreeable: the flat/neutral band is populated and load-bearing (real topics that leave the character unmoved), and every craving is paired with the aversion that bounds it. A character who engages everything equally fails this.",
    applies: (spine) => hasEntry(spine, "gradient"),
  },
  {
    key: "earned_arc",
    label: "Earned arc",
    description:
      "If the character has a relational arc, it is earned, not switched: the SAME through-line trait is re-aimed across low and high closeness (not a different personality), the high-closeness tell is foreshadowed at low closeness, and the deltas move specific gradient bands rather than restating the whole gradient. Hard limits never move.",
    applies: (spine) => hasEntry(spine, "relational_axis"),
  },
  {
    key: "psychometric_sanity",
    label: "Psychometric sanity",
    description:
      "The interior read (archetype/core, values, judgments) does not contradict the behavioral material: the IF-THEN tensions, the gradient, and the intents are consistent with who the character is said to be, not bolted on against it.",
  },
];

const CRITERION_KEYS = new Set(BIBLE_GATE_CRITERIA.map((c) => c.key));

export function applicableBibleCriteria(spine: WeaverBibleSpine): readonly GateCriterion[] {
  return BIBLE_GATE_CRITERIA.filter((c) => !c.applies || c.applies(spine));
}

function labelFor(key: string): string {
  return BIBLE_GATE_CRITERIA.find((c) => c.key === key)?.label ?? key;
}

export function buildGateVerdict(
  raw: Record<string, unknown>,
  applicable: readonly GateCriterion[] = BIBLE_GATE_CRITERIA,
): WeaverGateVerdict {
  const applicableKeys = new Set(applicable.map((c) => c.key));
  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria : [];
  const seen = new Map<string, WeaverGateCriterion>();
  for (const item of rawCriteria) {
    if (!item || typeof item !== "object") continue;
    const key = (item as Record<string, unknown>).key;
    if (typeof key !== "string" || !CRITERION_KEYS.has(key) || !applicableKeys.has(key) || seen.has(key)) continue;
    const passed = (item as Record<string, unknown>).passed === true;
    const noteRaw = (item as Record<string, unknown>).note;
    seen.set(key, {
      key,
      label: labelFor(key),
      passed,
      note: typeof noteRaw === "string" ? noteRaw.trim() : "",
    });
  }

  const criteria = BIBLE_GATE_CRITERIA.filter((c) => applicableKeys.has(c.key))
    .map((c) => seen.get(c.key))
    .filter((c): c is WeaverGateCriterion => Boolean(c));

  const passed =
    criteria.length === applicableKeys.size && criteria.every((c) => c.passed);

  const summaryRaw = raw.summary;
  return {
    passed,
    criteria,
    summary: typeof summaryRaw === "string" ? summaryRaw.trim() : "",
  };
}

export function deriveStatus(verdict: WeaverGateVerdict): "gated" | "flagged" {
  return verdict.passed ? "gated" : "flagged";
}
