import { registry } from "../MacroRegistry";

/**
 * Upper bound on iterations. Mirrors the {{repeat}} cap — a foreach body is
 * re-resolved once per item, so an unbounded list would let a single macro
 * blow up prompt assembly. Excess items are dropped with a warning.
 */
const MAX_FOREACH_ITEMS = 1000;

export function registerIterationMacros(): void {
  // ---- foreach (scoped, delayArgResolution) ----
  //
  // {{foreach::<list>}}body{{/foreach}}
  // {{foreach::<list>::<var>}}body{{/foreach}}
  // {{foreach::<list>::<var>::<delimiter>}}body{{/foreach}}
  //
  // Resolves the body once per item, exposing loop variables to the body:
  //   {{.item}}         current value           (name follows <var>, default "item")
  //   {{.item_index}}   0-based index
  //   {{.item_number}}  1-based index
  //   {{.item_count}}   total number of items
  //   {{.item_first}}   "true" on the first item, else ""
  //   {{.item_last}}    "true" on the last item,  else ""
  //
  // The list is a single string split on <delimiter> (default ","); each item
  // is trimmed and blanks are dropped, matching {{split}}/{{join}}. This pairs
  // directly with list-producing macros, e.g. {{foreach::{{players}}}}.
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
      if (!ctx.isScoped) {
        ctx.warn("{{foreach}} needs a body: {{foreach::list}}...{{/foreach}}");
        return "";
      }

      // delayArgResolution hands us raw AST per arg; resolve only what we need.
      const listStr = ctx.rawArgs[0] ? (await ctx.resolveNodes(ctx.rawArgs[0])).trim() : "";
      const varName =
        (ctx.rawArgs[1] ? (await ctx.resolveNodes(ctx.rawArgs[1])).trim() : "") || "item";
      const delimiter = ctx.rawArgs[2] ? await ctx.resolveNodes(ctx.rawArgs[2]) : ",";

      if (listStr === "") return "";

      // Empty delimiter = treat the whole string as one item (avoids splitting
      // into individual characters, which String.split("") would do).
      let items = (delimiter === "" ? [listStr] : listStr.split(delimiter))
        .map((s) => s.trim())
        .filter((s) => s !== "");
      if (items.length === 0) return "";
      if (items.length > MAX_FOREACH_ITEMS) {
        ctx.warn(`{{foreach}} capped at ${MAX_FOREACH_ITEMS} items (got ${items.length})`);
        items = items.slice(0, MAX_FOREACH_ITEMS);
      }

      // Loop variables are real local vars (so {{.item}} shorthand resolves
      // them). Snapshot any pre-existing values and restore them afterwards so
      // foreach never leaks its loop variables into the surrounding scope and
      // nests cleanly (inner/outer loops with the same var name).
      const local = ctx.env.variables.local;
      const keys = [
        varName,
        `${varName}_index`,
        `${varName}_number`,
        `${varName}_count`,
        `${varName}_first`,
        `${varName}_last`,
      ];
      const saved = new Map<string, string | undefined>();
      for (const k of keys) saved.set(k, local.has(k) ? local.get(k) : undefined);

      const count = items.length;
      let out = "";
      try {
        for (let i = 0; i < count; i++) {
          local.set(varName, items[i]);
          local.set(`${varName}_index`, String(i));
          local.set(`${varName}_number`, String(i + 1));
          local.set(`${varName}_count`, String(count));
          local.set(`${varName}_first`, i === 0 ? "true" : "");
          local.set(`${varName}_last`, i === count - 1 ? "true" : "");
          out += await ctx.resolveNodes(ctx.bodyRaw);
        }
      } finally {
        for (const [k, prev] of saved) {
          if (prev === undefined) local.delete(k);
          else local.set(k, prev);
        }
      }
      return out;
    },
  });
}
