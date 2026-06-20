import { registry } from "../MacroRegistry";
import type { MacroExecContext } from "../types";
import { parseDelimitedList, formatList, MAX_LIST_ITEMS } from "../list-utils";
import { evaluateMacroCondition } from "../conditions";

/**
 * Scoped iteration macros that loop a list and resolve a body per item:
 *   {{foreach}} — concatenate the body for every item
 *   {{filter}}  — keep items whose body (a predicate) is truthy
 *   {{some}} / {{every}} — quantifiers over a predicate
 *
 * They share the `::list::var::delimiter` signature, the loop-variable bindings,
 * and the hygienic save/restore below. {{filter}}/{{some}}/{{every}} treat the
 * body as an {{if}}-style condition (same operators, negation, and falsy set)
 * via evaluateMacroCondition.
 */

// Loop variables bound for the body. `item` is the value; the suffixed forms
// give position/size/edge info. See bindLoopVars.
const LOOP_SUFFIXES = ["", "_index", "_number", "_count", "_first", "_last"] as const;

function loopKeys(varName: string): string[] {
  return LOOP_SUFFIXES.map((s) => `${varName}${s}`);
}

/** Snapshot the loop variables' current values so they can be restored. */
function snapshotVars(
  local: Map<string, string>,
  keys: string[],
): Map<string, string | undefined> {
  const saved = new Map<string, string | undefined>();
  for (const k of keys) saved.set(k, local.has(k) ? local.get(k) : undefined);
  return saved;
}

/** Restore loop variables to their snapshot (deleting ones that didn't exist). */
function restoreVars(local: Map<string, string>, saved: Map<string, string | undefined>): void {
  for (const [k, prev] of saved) {
    if (prev === undefined) local.delete(k);
    else local.set(k, prev);
  }
}

/** Bind the loop variables for iteration `i` of `count` items. */
function bindLoopVars(
  local: Map<string, string>,
  varName: string,
  item: string,
  i: number,
  count: number,
): void {
  local.set(varName, item);
  local.set(`${varName}_index`, String(i));
  local.set(`${varName}_number`, String(i + 1));
  local.set(`${varName}_count`, String(count));
  local.set(`${varName}_first`, i === 0 ? "true" : "");
  local.set(`${varName}_last`, i === count - 1 ? "true" : "");
}

interface IterArgs {
  items: string[];
  varName: string;
}

/**
 * Parse the shared `::list::var::delimiter` signature. Returns null (with a
 * warning) when used without a body. Caps the item count like {{repeat}}.
 */
async function parseIterArgs(ctx: MacroExecContext): Promise<IterArgs | null> {
  if (!ctx.isScoped) {
    ctx.warn(`{{${ctx.name}}} needs a body: {{${ctx.name}::list}}...{{/${ctx.name}}}`);
    return null;
  }
  const listStr = ctx.rawArgs[0] ? (await ctx.resolveNodes(ctx.rawArgs[0])).trim() : "";
  const varName = (ctx.rawArgs[1] ? (await ctx.resolveNodes(ctx.rawArgs[1])).trim() : "") || "item";
  const delimiter = ctx.rawArgs[2] ? await ctx.resolveNodes(ctx.rawArgs[2]) : ",";
  let items = parseDelimitedList(listStr, delimiter);
  if (items.length > MAX_LIST_ITEMS) {
    ctx.warn(`{{${ctx.name}}} capped at ${MAX_LIST_ITEMS} items (got ${items.length})`);
    items = items.slice(0, MAX_LIST_ITEMS);
  }
  return { items, varName };
}

/** Resolve the scoped body and evaluate it as an {{if}}-style condition. */
async function bodyIsTruthy(ctx: MacroExecContext): Promise<boolean> {
  let s = (await ctx.resolveNodes(ctx.bodyRaw)).trim();
  // Safety re-resolve for the rare case where a value depends on state mutated
  // later in the same template (mirrors {{if}}).
  if (s.includes("{{")) {
    const next = (await ctx.resolve(s)).trim();
    if (next !== s) s = next;
  }
  return evaluateMacroCondition(s, ctx.env.variables);
}

export function registerIterationMacros(): void {
  // ---- foreach ----
  //
  // {{foreach::<list>}}body{{/foreach}}
  // {{foreach::<list>::<var>}}body{{/foreach}}
  // {{foreach::<list>::<var>::<delimiter>}}body{{/foreach}}
  //
  // Body bindings (replace `item` with <var>): {{.item}}, {{.item_index}}
  // (0-based), {{.item_number}} (1-based), {{.item_count}}, {{.item_first}},
  // {{.item_last}} ("true"/"").
  registry.registerMacro({
    builtIn: true,
    name: "foreach",
    category: "Iteration",
    description:
      "Iterate over a delimited list, resolving the body once per item. " +
      "Usage: {{foreach::a,b,c}}...{{.item}}...{{/foreach}}. Optional args: loop " +
      "variable name (default 'item') and delimiter (default ',').",
    returnType: "string",
    delayArgResolution: true,
    aliases: ["each", "for_each"],
    handler: async (ctx) => {
      const parsed = await parseIterArgs(ctx);
      if (!parsed) return "";
      const { items, varName } = parsed;
      if (items.length === 0) return "";

      const local = ctx.env.variables.local;
      const saved = snapshotVars(local, loopKeys(varName));
      let out = "";
      try {
        for (let i = 0; i < items.length; i++) {
          bindLoopVars(local, varName, items[i], i, items.length);
          out += await ctx.resolveNodes(ctx.bodyRaw);
        }
      } finally {
        restoreVars(local, saved);
      }
      return out;
    },
  });

  // ---- filter: keep items whose predicate body is truthy ----
  registry.registerMacro({
    builtIn: true,
    name: "filter",
    category: "Iteration",
    description:
      "Keep list items whose body (an {{if}}-style condition) is truthy; returns a " +
      "comma-separated list. Usage: {{filter::a,b,c::x}}{{gt::{{.x}}::1}}{{/filter}}.",
    returnType: "string",
    delayArgResolution: true,
    aliases: ["where"],
    handler: async (ctx) => {
      const parsed = await parseIterArgs(ctx);
      if (!parsed) return "";
      const { items, varName } = parsed;
      if (items.length === 0) return "";

      const local = ctx.env.variables.local;
      const saved = snapshotVars(local, loopKeys(varName));
      const kept: string[] = [];
      try {
        for (let i = 0; i < items.length; i++) {
          bindLoopVars(local, varName, items[i], i, items.length);
          if (await bodyIsTruthy(ctx)) kept.push(items[i]);
        }
      } finally {
        restoreVars(local, saved);
      }
      return formatList(kept);
    },
  });

  // ---- some / every: predicate quantifiers (condition-compatible) ----
  registry.registerMacro({
    builtIn: true,
    terminal: true,
    name: "some",
    category: "Iteration",
    description:
      "'true' if any list item's body (an {{if}}-style condition) is truthy, else ''. " +
      "Short-circuits. Usage: {{some::{{players}}::p}}{{gt::{{@hp_{{.p}}}}::0}}{{/some}}.",
    returnType: "boolean",
    delayArgResolution: true,
    aliases: ["any"],
    handler: async (ctx) => {
      const parsed = await parseIterArgs(ctx);
      if (!parsed) return "";
      const { items, varName } = parsed;

      const local = ctx.env.variables.local;
      const saved = snapshotVars(local, loopKeys(varName));
      let result = false;
      try {
        for (let i = 0; i < items.length; i++) {
          bindLoopVars(local, varName, items[i], i, items.length);
          if (await bodyIsTruthy(ctx)) {
            result = true;
            break;
          }
        }
      } finally {
        restoreVars(local, saved);
      }
      return result ? "true" : "";
    },
  });

  registry.registerMacro({
    builtIn: true,
    terminal: true,
    name: "every",
    category: "Iteration",
    description:
      "'true' if every list item's body (an {{if}}-style condition) is truthy, else ''. " +
      "Vacuously 'true' for an empty list. Short-circuits.",
    returnType: "boolean",
    delayArgResolution: true,
    aliases: ["all"],
    handler: async (ctx) => {
      const parsed = await parseIterArgs(ctx);
      if (!parsed) return "";
      const { items, varName } = parsed;

      const local = ctx.env.variables.local;
      const saved = snapshotVars(local, loopKeys(varName));
      let result = true;
      try {
        for (let i = 0; i < items.length; i++) {
          bindLoopVars(local, varName, items[i], i, items.length);
          if (!(await bodyIsTruthy(ctx))) {
            result = false;
            break;
          }
        }
      } finally {
        restoreVars(local, saved);
      }
      return result ? "true" : "";
    },
  });
}
