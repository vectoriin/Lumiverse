import { SPINE_SLOTS, getSlot, type SynthesisGroupDef } from "./slots";
import { BIBLE_GATE_CRITERIA, type GateCriterion } from "./gate";
import { criteriaForKind } from "./field-gate";
import type { WeaverFieldDef } from "./fields";
import type {
  WeaverCommittedFact,
  WeaverTasteProfile,
  WeaverBibleSpine,
  WeaverGateVerdict,
} from "../../types/weaver";

function slotCatalog(): string {
  return SPINE_SLOTS.map(
    (s) => `- ${s.id} (${s.label}): ${s.description}`,
  ).join("\n");
}

/** Lists hybrid slots' sub-parts so extraction can tag a fact to the right part. */
function hybridPartCatalog(): string {
  return SPINE_SLOTS.filter((s) => s.parts && s.parts.length > 0)
    .map((s) => `- ${s.id}: ${s.parts!.map((p) => `${p.id} (${p.label})`).join(", ")}`)
    .join("\n");
}

export function buildExtractionPrompt(): string {
  return `You are the Weaver's read-back stage. You are given a piece of SOURCE MATERIAL describing a character idea. Your job is NOT to write a character. Your job is to read carefully and separate two things:

1. COMMITTED FACTS — things the author actually established in the text. Tag each to the spine slot it belongs to.

   Rules for a fact:
   - State the bare value, not a sentence about it. Drop framing verbs and lead-ins ("Her name is", "She is", "The character has") and write only the value itself.
   - Extract ONLY what the text directly supports. Never embellish, generalize, or interpret. Do not append editorial or comparative claims the author did not write. If the text didn't say it, it does not exist.
   - If you are tempted to explain WHY something is true, stop — that is interpretation, not a fact.
   - A committed fact belongs to the author, not to you.

2. GAPS — spine slots the text leaves empty or genuinely ambiguous, where a writer would otherwise be forced to guess. Only list a slot as a gap if it is BOTH (a) not adequately covered by committed facts AND (b) load-bearing — its absence would push generation toward generic, average output.

The spine slots:
${slotCatalog()}

Guidance:
- A single sentence can yield multiple committed facts across different slots.
- Do not duplicate: if a slot is covered by a committed fact, it is NOT a gap.
- Prefer fewer, sharper facts over many vague ones. Terse beats complete.
- When in doubt between stating a fact plainly and elaborating it, always choose plain.
- "central_contradiction" is only a committed fact if the text actually shows two opposing forces; otherwise it is almost always a gap.
- The reaction gradient: a stated limit or craving ("she refuses to ever lie", "lives for a real problem to solve") IS a committed fact for the "gradient" slot — tag it there.
- Be honest about ambiguity: if the text gestures at something but does not commit, treat it as a gap and note what is ambiguous.

Some slots have SUB-PARTS. When a committed fact clearly belongs to ONE sub-part, set its "part" to that sub-part id (e.g. a hard limit → gradient part "wont"; a craving → gradient part "craves"; a life-long want → intents part "super_objective"). If it does not clearly map to one sub-part, omit "part". Sub-parts:
${hybridPartCatalog()}

CONDITIONAL slots — off by default, most characters do NOT have them:
- "relational_axis": list it (as a fact or a gap) ONLY if the SOURCE shows the character CHANGES as the relationship or bond deepens — a guard that drops over time, cold-then-warm, slow corruption, trust that has to be earned and then transforms them. If the source does not actually show change-over-relationship, OMIT this slot entirely — do not invent an arc for a static character.
- "intimacy": list it (as a fact or a gap) ONLY if the SOURCE centers on or clearly involves desire, sexuality, or physical closeness as part of who this character is. Keep anything you tag STRUCTURAL and non-explicit — what they are drawn to, what they refuse, where the lines are — never graphic content. If the source does not involve intimacy, OMIT this slot entirely.

Output STRICT JSON, no prose, no code fence:
{
  "committed_facts": [
    { "slot": "<slot id>", "part": "<optional sub-part id, only for hybrid slots>", "fact": "<concise statement grounded in the text>" }
  ],
  "gaps": [
    { "slot": "<slot id>", "note": "<what's missing or ambiguous for this slot>" }
  ]
}`;
}

export function buildExtractionUserMessage(seedText: string): string {
  return `SOURCE MATERIAL:\n\n${seedText.trim()}`;
}

export function buildAxisSpreadPrompt(): string {
  return `You are the Weaver's interview stage. You ask the author ONE focused question to fill a single missing piece of their character, offering options that point in GENUINELY DIFFERENT directions — so that picking one is a real creative choice, not picking between near-identical phrasings.

You will be told which SLOT to fill, the FACTS already established (from the author's dream and earlier answers), and any TASTE the author has shown.

STEP 1 — Choose the axis.
Pick ONE axis of variation: a dimension whose ends are genuinely OPPOSED, so different points produce noticeably different characters. A good axis has real tension between its extremes (e.g. a direction and its opposite, or mutually-exclusive branches) — not a quality you can have "more or less" of. Name it plainly and say in one line why it matters for THIS character.

STEP 2 — Generate 3-4 options, one per distinct point on that axis.

THE BAR (this is the whole point — do not miss it):
- The options must be genuinely DIVERGENT — each a different ANSWER, not a different wording of the same answer. If you could swap two without a reader noticing a change in the character, you have failed; pull them further apart and regenerate.
- Reject same-register lists. Three variations of one idea (three flavors of "guarded", three ways to be "driven", three synonyms) is the failure to avoid. Each option should send the character somewhere the others don't.
- Each option's content is a COMPLETE, CONCRETE statement — a full thought with a specific behavior, belief, or detail. Never a bare adjective or a one-word trait. Show it, grounded in this character.
- Stay consistent with the established FACTS. Diverge only in the space the author left open; never contradict what they committed to.
- Do not cluster on the single most obvious answer. The first thing that comes to mind is usually the mean — reach past it for at least one option.
- Caption each option (4-10 words) with the human tradeoff or feel it represents — what kind of character choosing it would make.

STEP 3 — Respect TASTE: if the author has shown preferences, bias the whole spread accordingly.

IF A STEER IS PROVIDED: keep the SAME axis but move the options decisively toward the steer — the new spread must be VISIBLY different from a default spread and clearly reflect what the author asked for. Do not return the same options. (Only if the steer rejects the axis itself should you choose a different axis.)

Output STRICT JSON, no prose, no code fence:
{
  "axis": { "name": "<the dimension options vary along>", "description": "<one line on why it matters for this character>" },
  "options": [
    { "caption": "<short human tradeoff>", "content": "<a complete, concrete statement — never a bare adjective>" }
  ]
}`;
}

function formatFacts(facts: WeaverCommittedFact[]): string {
  if (facts.length === 0) return "(nothing established yet)";
  return facts
    .map((f) => {
      const label = getSlot(f.slot)?.label ?? f.slot;
      return `- ${label}: ${f.fact}`;
    })
    .join("\n");
}

export function buildAxisSpreadUserMessage(input: {
  slot: string;
  facts: WeaverCommittedFact[];
  taste: WeaverTasteProfile;
  steer?: string;
  avoid?: string[];
  part?: { label: string; description?: string };
}): string {
  const slot = getSlot(input.slot);
  const lines: string[] = [];

  if (input.part) {
    lines.push(`ASPECT TO FILL: ${slot?.label ?? input.slot} — ${input.part.label}`);
    if (input.part.description) lines.push(`What this aspect captures: ${input.part.description}`);
  } else {
    lines.push(`SLOT TO FILL: ${slot?.label ?? input.slot}`);
    if (slot) lines.push(`What this slot captures: ${slot.description}`);
  }
  const parts = lines;
  parts.push(`\nFACTS ALREADY ESTABLISHED:\n${formatFacts(input.facts)}`);
  if (input.taste.steers.length > 0) {
    parts.push(`\nTASTE the author has shown (bias the spread toward these):\n${input.taste.steers.map((s) => `- ${s}`).join("\n")}`);
  }
  if (input.steer && input.steer.trim()) {
    parts.push(`\nSTEER for this question (re-spread toward this): ${input.steer.trim()}`);
  }
  const avoid = (input.avoid ?? []).filter((a) => a && a.trim());
  if (avoid.length > 0) {
    parts.push(`\nThe author already saw and rejected these options — do NOT repeat them or offer minor rewordings of them:\n${avoid.map((a) => `- ${a}`).join("\n")}`);
  }
  return parts.join("\n");
}

export interface SynthesisTarget {
  slot: string;
  part: string;
  label: string;
  description?: string;
  fill: "elicit" | "generate";
}

export interface SynthesisPriorPart {
  slot: string;
  part: string;
  content: string;
}

export function buildBibleSynthesisPrompt(group: SynthesisGroupDef): string {
  return `You are the Weaver's synthesis stage, authoring ONE layer of a character's BIBLE: a compact shared brain that every later field is written from. You are NOT writing prose fields yet.

THIS PASS — ${group.label}: ${group.instruction}

You are given the FACTS the author has committed to (their dream + interview answers). These facts are LOCKED: they are the author's own specific idea, the whole reason this character won't collapse into a generic average. Build everything AROUND them so it coheres — never contradict, generalize, or water one down. You are also given what EARLIER passes already authored; stay consistent with it and build on it.

AUTHOR THE TARGETS. For each target under TO AUTHOR, write one concrete, specific statement that follows believably from the locked facts and the earlier passes. A target is one part of the spine: write the content for exactly that part. The statement must be a complete, particular thing — a real behavior, belief, sound, limit, or detail — never a bare adjective or a hedge. Do not drift toward the statistical mean: the first thing that comes to mind for this premise is the average; go past it.

A target marked [author] is your craft — the author wants you to invent it from the spine. A target marked [infer] is one the author left open: make your best, overturnable guess from the dream and their taste, and keep it modest and consistent rather than inventing bold new canon.

Output STRICT JSON, no prose, no code fence:
{
  "authored": [
    { "slot": "<slot id>", "part": "<part id>", "content": "<a complete, concrete statement>" }
  ]
}
Return one entry per target, using the exact slot and part ids given. Author nothing outside TO AUTHOR.`;
}

export function buildBibleSynthesisUserMessage(input: {
  facts: WeaverCommittedFact[];
  taste: WeaverTasteProfile;
  targets: SynthesisTarget[];
  priorAuthored: SynthesisPriorPart[];
}): string {
  const parts: string[] = [];
  parts.push(`LOCKED FACTS (the author's committed idea — carry the meaning faithfully):\n${formatFacts(input.facts)}`);
  if (input.taste.steers.length > 0) {
    parts.push(`\nTASTE the author has shown (let it bias what you author):\n${input.taste.steers.map((s) => `- ${s}`).join("\n")}`);
  }
  if (input.priorAuthored.length > 0) {
    parts.push(
      `\nALREADY AUTHORED by earlier passes (stay consistent; build on this):\n${input.priorAuthored
        .map((p) => `- ${getSlot(p.slot)?.label ?? p.slot}${p.part !== p.slot ? ` · ${p.part}` : ""}: ${p.content}`)
        .join("\n")}`,
    );
  }
  parts.push(
    `\nTO AUTHOR (write content for each part):\n${input.targets
      .map((t) => {
        const addr = t.part === t.slot ? t.slot : `${t.slot}.${t.part}`;
        const tag = t.fill === "generate" ? "[author]" : "[infer]";
        const desc = t.description ? `: ${t.description}` : "";
        return `- ${addr} (${t.label}) ${tag}${desc}`;
      })
      .join("\n")}`,
  );
  return parts.join("\n");
}

export function buildBibleWeavePrompt(): string {
  return `You are the Weaver's synthesis stage, doing the final WEAVE over a fully assembled character BIBLE. You add nothing new about the character — you only connect what is already there and summarize it.

1. DRAW THE CAUSAL LINKS. Identify how the spine slots cause each other — an experience that hardened into a value, a value that produces a judgment, a contradiction that distorts the stance toward others. Each link names a cause slot, an effect slot, and the relation between them. These links are what make the character read as one coherent person rather than a list. Only assert a link the spine actually supports.

2. WRITE THE BRIEF. One tight paragraph (3-5 sentences) describing this specific person as a writer would brief an actor — concrete and particular, surfacing the central tension and, if present, the reaction gradient and the relational arc in plain terms. No genre clichés, no hedging.

Output STRICT JSON, no prose, no code fence:
{
  "causal_links": [
    { "from": "<slot id>", "to": "<slot id>", "relation": "<short phrase, e.g. 'hardened into'>" }
  ],
  "brief": "<one concrete paragraph>"
}`;
}

export function buildBibleWeaveUserMessage(spine: WeaverBibleSpine): string {
  const entries = formatSpineEntries(spine);
  return `THE ASSEMBLED SPINE (connect these; do not invent beyond them):\n${entries || "(no entries)"}\n\nFor causal_links, reference slots by their id. Valid slot ids:\n${SPINE_SLOTS.map((s) => `- ${s.id}`).join("\n")}`;
}

function gateRubric(criteria: readonly GateCriterion[]): string {
  return criteria.map((c) => `- ${c.key} (${c.label}): ${c.description}`).join("\n");
}

export function buildBibleGatePrompt(applicable: readonly GateCriterion[] = BIBLE_GATE_CRITERIA): string {
  return `You are the Weaver's gate. A character BIBLE has been synthesized and you must judge whether it is strong enough to write a distinctive character from — BEFORE any fields are written. Be a demanding critic, not a cheerleader: the cost of passing a weak Bible is an entire generic character.

Judge the Bible against each criterion below. For each, decide pass or fail and write one sharp sentence saying exactly what is strong or what is thin (name the specific weakness — do not be vague). A criterion fails if the Bible only half-meets it.

CRITERIA:
${gateRubric(applicable)}

Then write a short plain-language summary the author can read: if it passed, what makes this character work; if it failed, the one or two things that would most raise the ceiling.

Output STRICT JSON, no prose, no code fence:
{
  "criteria": [
    { "key": "<criterion key>", "passed": true|false, "note": "<one sharp sentence>" }
  ],
  "summary": "<plain-language summary for the author>"
}`;
}

function formatSpineEntries(spine: WeaverBibleSpine): string {
  return spine.entries
    .map((e) => `- ${getSlot(e.slot)?.label ?? e.slot}: ${e.content}`)
    .join("\n");
}

function formatSpineLinks(spine: WeaverBibleSpine): string {
  return spine.causal_links
    .map((l) => {
      const from = getSlot(l.from)?.label ?? l.from;
      const to = getSlot(l.to)?.label ?? l.to;
      return `- ${from} → ${l.relation} → ${to}`;
    })
    .join("\n");
}

function voiceMaterial(spine: WeaverBibleSpine): string {
  return spine.entries.find((e) => e.slot === "voice")?.content.trim() ?? "";
}

export function buildBibleGateUserMessage(spine: WeaverBibleSpine): string {
  const entries = formatSpineEntries(spine);
  const links = formatSpineLinks(spine);
  const parts: string[] = [];
  parts.push(`THE BIBLE\n\nBrief:\n${spine.brief || "(none)"}`);
  parts.push(`\nSpine:\n${entries || "(no entries)"}`);
  if (links) parts.push(`\nHow it connects:\n${links}`);
  return parts.join("\n");
}

export function buildFieldRenderPrompt(field: WeaverFieldDef): string {
  const focus = field.primarySlots.map((s) => getSlot(s)?.label ?? s).join(", ");
  return `You are the Weaver's render stage. You are writing ONE field of a character — the "${field.label}" field — from the character's FROZEN BIBLE.

The Bible is the single shared source of truth. Write ONLY from it: every choice must trace to the Bible's brief, spine, and causal links. Never invent details that contradict the Bible, and never drift toward the generic, average version of this character — the Bible exists precisely to keep this character specific. The first thing that comes to mind for a premise is usually the mean; the Bible is how you reach past it.

You are writing this field in ISOLATION. You will NOT see the other rendered fields and must not reference or assume their exact wording. Anything that must agree across fields agrees because it is drawn from the same Bible — so stay faithful to the Bible and coherence takes care of itself.

Lean especially on these parts of the spine for this field: ${focus}. The whole Bible remains available as context.

FIELD GUIDANCE — "${field.label}":
${field.renderGuidance}

Output ONLY the field's content as plain text — no JSON, no code fence, no field label, no preamble, and no commentary before or after.`;
}

export function buildFieldRenderUserMessage(input: {
  field: WeaverFieldDef;
  spine: WeaverBibleSpine;
}): string {
  const { field, spine } = input;
  const parts: string[] = [];
  parts.push(`THE FROZEN BIBLE\n\nBrief:\n${spine.brief || "(none)"}`);
  parts.push(`\nSpine:\n${formatSpineEntries(spine) || "(no entries)"}`);
  const links = formatSpineLinks(spine);
  if (links) parts.push(`\nHow it connects:\n${links}`);

  if (field.kind === "voice" || field.kind === "voiced" || field.kind === "alichat") {
    const voice = voiceMaterial(spine);
    if (voice) {
      parts.push(
        `\nVOICE MATERIAL (the shared source of truth for how this character sounds — every voice-bearing field draws on this so they cohere):\n${voice}`,
      );
    }
  }

  parts.push(`\nNow write the ${field.label} field.`);
  return parts.join("\n");
}

export function buildFieldReviseUserMessage(input: {
  field: WeaverFieldDef;
  spine: WeaverBibleSpine;
  previous: string;
  verdict: WeaverGateVerdict;
}): string {
  const { field, previous, verdict } = input;
  const failed = verdict.criteria.filter((c) => !c.passed);
  const flags =
    failed.length > 0
      ? failed.map((c) => `- ${c.label}: ${c.note || "(failed)"}`).join("\n")
      : "- (the gate did not pass, but gave no per-criterion notes)";

  const parts: string[] = [];
  parts.push(buildFieldRenderUserMessage({ field: input.field, spine: input.spine }));
  parts.push(`\nA prior attempt at the ${field.label} field did NOT pass the gate.`);
  parts.push(`\nPrior attempt:\n${previous}`);
  parts.push(`\nWhat the gate flagged (fix exactly these):\n${flags}`);
  if (verdict.summary) parts.push(`\nGate summary: ${verdict.summary}`);
  parts.push(
    `\nWrite a single improved version of the ${field.label} field that fixes these problems while staying faithful to the Bible. Output ONLY the field content.`,
  );
  return parts.join("\n");
}

export function buildFieldNudgeUserMessage(input: {
  field: WeaverFieldDef;
  spine: WeaverBibleSpine;
  nudge: string;
  previous?: string;
}): string {
  const { field, nudge, previous } = input;
  const parts: string[] = [];
  parts.push(buildFieldRenderUserMessage({ field: input.field, spine: input.spine }));
  if (previous && previous.trim()) {
    parts.push(`\nThe current ${field.label} field:\n${previous.trim()}`);
  }
  parts.push(`\nThe creator wants this field steered. Lean the result toward: ${nudge.trim()}`);
  parts.push(
    `\nThe steer adjusts emphasis, tone, and flavor only — stay faithful to the Bible and never add facts that go beyond or contradict it. Output ONLY the ${field.label} field content.`,
  );
  return parts.join("\n");
}

export function buildFieldGatePrompt(field: WeaverFieldDef): string {
  const rubric = criteriaForKind(field.kind)
    .map((c) => `- ${c.key} (${c.label}): ${c.description}`)
    .join("\n");
  return `You are the Weaver's field gate. A single character field — the "${field.label}" field — has been written FROM the character's Bible, and you must judge whether it is good enough to keep. Be a demanding critic, not a cheerleader: passing a weak field puts generic writing on the card.

The Bible has ALREADY been judged for whether the character CONCEPT is strong — do not re-judge the concept or the idea. Judge only this rendering: did it project the Bible faithfully and specifically, in the right shape, without sliding toward the generic?

Judge the field against each criterion below. For each, decide pass or fail and write one sharp sentence naming exactly what is strong or what is weak — be specific, never vague. A criterion fails if the field only half-meets it.

CRITERIA:
${rubric}

Then write a short plain-language summary the author can read: if it passed, what makes the field work; if it failed, the single most important thing to fix.

Output STRICT JSON, no prose, no code fence:
{
  "criteria": [
    { "key": "<criterion key>", "passed": true|false, "note": "<one sharp sentence>" }
  ],
  "summary": "<plain-language summary for the author>"
}`;
}

/** User-turn content for the field gate: the Bible to check against + the field. */
export function buildFieldGateUserMessage(input: {
  field: WeaverFieldDef;
  content: string;
  spine: WeaverBibleSpine;
}): string {
  const { field, content, spine } = input;
  const parts: string[] = [];
  parts.push(`THE BIBLE (what this field must be faithful to)\n\nBrief:\n${spine.brief || "(none)"}`);
  parts.push(`\nSpine:\n${formatSpineEntries(spine) || "(no entries)"}`);
  parts.push(`\nTHE ${field.label.toUpperCase()} FIELD AS WRITTEN:\n${content}`);
  return parts.join("\n");
}
