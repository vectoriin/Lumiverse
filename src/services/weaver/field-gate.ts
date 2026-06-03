import type { WeaverGateVerdict, WeaverGateCriterion } from "../../types/weaver";
import type { WeaverFieldKind } from "./fields";

export interface FieldGateCriterion {
  key: string;
  label: string;
  description: string;
  appliesTo: "all" | readonly WeaverFieldKind[];
}

export const FIELD_GATE_CRITERIA: readonly FieldGateCriterion[] = [
  {
    key: "faithful",
    label: "Faithful",
    description:
      "The field is consistent with the Bible — it projects the established spine and invents nothing that contradicts it. Specificity from the Bible is carried through, not discarded toward something more generic.",
    appliesTo: "all",
  },
  {
    key: "specific",
    label: "Specific",
    description:
      "The field commits to concrete, particular choices grounded in this character — not generic filler, hedges, or traits that could describe almost anyone. This is the anti-average check at the field level.",
    appliesTo: "all",
  },
  {
    key: "in_voice",
    label: "In voice",
    description:
      "The dialogue matches the character's voice as set out in the Bible — rhythm, diction, and register sound like this specific person, so it coheres with the other voice-bearing fields.",
    appliesTo: ["voiced", "alichat"],
  },
  {
    key: "voiced_narration",
    label: "Voiced narration",
    description:
      "The narration around the dialogue is in the character's own first-person lens and idiolect — action beats and inner thought sound like this specific person, not a neutral third-person camera reporting events.",
    appliesTo: ["voiced", "alichat"],
  },
  {
    key: "anti_overindex",
    label: "No recital",
    description:
      "The physical / [FORM] material is treated as a consult-only reference, not inventoried or recited: the writing does not read out measurements or list appearance details like a spec sheet read aloud, and physical facts surface only where they carry weight.",
    appliesTo: ["bundle"],
  },
  {
    key: "coverage",
    label: "Coverage",
    description:
      "The example set covers varied, distinct beats — a peak moment, a held boundary, the character's humor, a value-driven choice, and a mundane exchange — rather than repeating one register. If the character has a relational arc, a low-closeness and a high-closeness exchange are both present and show the same through-line.",
    appliesTo: ["alichat"],
  },
  {
    key: "well_formed",
    label: "Well-formed",
    description:
      "The field has the right shape and length for what it is, carries no meta-commentary, preamble, or instructions to the reader, and is valid to drop straight into a character card.",
    appliesTo: "all",
  },
];

export function criteriaForKind(kind: WeaverFieldKind): FieldGateCriterion[] {
  return FIELD_GATE_CRITERIA.filter(
    (c) => c.appliesTo === "all" || c.appliesTo.includes(kind),
  );
}

function labelFor(key: string): string {
  return FIELD_GATE_CRITERIA.find((c) => c.key === key)?.label ?? key;
}

export function buildFieldGateVerdict(
  raw: Record<string, unknown>,
  applicable: readonly FieldGateCriterion[],
): WeaverGateVerdict {
  const applicableKeys = new Set(applicable.map((c) => c.key));
  const rawCriteria = Array.isArray(raw.criteria) ? raw.criteria : [];
  const seen = new Map<string, WeaverGateCriterion>();
  for (const item of rawCriteria) {
    if (!item || typeof item !== "object") continue;
    const key = (item as Record<string, unknown>).key;
    if (typeof key !== "string" || !applicableKeys.has(key) || seen.has(key)) continue;
    const passed = (item as Record<string, unknown>).passed === true;
    const noteRaw = (item as Record<string, unknown>).note;
    seen.set(key, {
      key,
      label: labelFor(key),
      passed,
      note: typeof noteRaw === "string" ? noteRaw.trim() : "",
    });
  }

  const criteria = applicable
    .map((c) => seen.get(c.key))
    .filter((c): c is WeaverGateCriterion => Boolean(c));

  const passed = criteria.length === applicable.length && criteria.every((c) => c.passed);

  const summaryRaw = raw.summary;
  return {
    passed,
    criteria,
    summary: typeof summaryRaw === "string" ? summaryRaw.trim() : "",
  };
}

export function deriveFieldStatus(verdict: WeaverGateVerdict): "passed" | "flagged" {
  return verdict.passed ? "passed" : "flagged";
}
