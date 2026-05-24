import type { LlmMessage, ToolDefinition } from "../../llm/types";
import type { CachingContext, CachingInput, CachingOutput } from "./types";

interface AnthropicPromptCachingConfig {
  enabled: boolean;
  automatic: boolean;
  cacheControl?: Record<string, unknown>;
  breakpoints: {
    tools: boolean;
    system: boolean;
    messages: boolean;
  };
}

const DISABLED: AnthropicPromptCachingConfig = {
  enabled: false,
  automatic: false,
  breakpoints: { tools: false, system: false, messages: false },
};

function resolveConfig(
  metadata: Record<string, any> | null | undefined,
): AnthropicPromptCachingConfig {
  const raw = metadata?.prompt_caching;
  if (raw !== true && (!raw || typeof raw !== "object" || Array.isArray(raw))) {
    return DISABLED;
  }
  const record = raw === true ? { type: "ephemeral" } : raw;
  const breakpoints =
    record.breakpoints && typeof record.breakpoints === "object" && !Array.isArray(record.breakpoints)
      ? record.breakpoints
      : {};
  return {
    enabled: true,
    automatic: record.automatic !== false,
    cacheControl: {
      type: "ephemeral",
      ...(record.ttl === "1h" ? { ttl: "1h" } : {}),
    },
    breakpoints: {
      tools: breakpoints.tools === true,
      system: breakpoints.system === true,
      messages: breakpoints.messages === true,
    },
  };
}

function applyMessageBreakpoints(
  messages: LlmMessage[],
  config: AnthropicPromptCachingConfig,
): LlmMessage[] {
  if (!config.enabled) return messages;
  if (!config.breakpoints.system && !config.breakpoints.messages) return messages;
  const lastConversationIdx = config.breakpoints.messages
    ? (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role !== "system") return i;
        }
        return -1;
      })()
    : -1;
  return messages.map((message, index) => {
    const shouldCacheSystem = config.breakpoints.system && message.role === "system";
    const shouldCacheMessage = index === lastConversationIdx;
    if (!shouldCacheSystem && !shouldCacheMessage) return message;
    return { ...message, cache_control: config.cacheControl };
  });
}

function applyToolBreakpoints(
  tools: ToolDefinition[] | undefined,
  config: AnthropicPromptCachingConfig,
): ToolDefinition[] | undefined {
  if (!tools || !config.enabled || !config.breakpoints.tools) return tools;
  return tools.map((tool) => ({ ...tool, cache_control: config.cacheControl }));
}

/**
 * Anthropic native prompt caching.
 *
 * Two coordinated outputs:
 *   1. Copy `metadata.prompt_caching` (truthy) onto `params.prompt_caching`
 *      so the Anthropic provider's `buildBody` can normalize it into the
 *      top-level body `cache_control` field.
 *   2. When breakpoints are configured, attach inline `cache_control`
 *      markers to the last conversation message, system messages, and the
 *      last tool definition as appropriate.
 */
export function applyAnthropicCaching(
  ctx: CachingContext,
  input: CachingInput,
): CachingOutput {
  const cacheSetting = ctx.metadata?.prompt_caching;
  const params =
    cacheSetting === true ||
    (cacheSetting && typeof cacheSetting === "object" && !Array.isArray(cacheSetting))
      ? { ...input.params, prompt_caching: cacheSetting }
      : input.params;

  const config = resolveConfig(ctx.metadata);
  return {
    params,
    messages: applyMessageBreakpoints(input.messages, config),
    tools: applyToolBreakpoints(input.tools, config),
  };
}

export const __test__ = { resolveConfig, applyMessageBreakpoints, applyToolBreakpoints };
