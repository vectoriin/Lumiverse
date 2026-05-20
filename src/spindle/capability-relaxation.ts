import type { SpindleCapability } from "lumiverse-spindle-types";

export const TEMP_RELAX_CAPABILITY_BLOCKING_ENV = "LUMIVERSE_SPINDLE_RELAX_CAPABILITY_BLOCKING";

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

// TODO_REMOVE_RELAXED_CAPABILITY_BLOCKING: temporary extension compatibility stopgap.
const TEMPORARILY_RELAXED_CAPABILITIES: readonly SpindleCapability[] = [
  "dynamic_code_execution",
  "base64_decode",
];

export function isCapabilityBlockingTemporarilyRelaxed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return TRUTHY_ENV_VALUES.has((env[TEMP_RELAX_CAPABILITY_BLOCKING_ENV] ?? "").trim().toLowerCase());
}

export function withTemporarilyRelaxedBackendCapabilities(
  declared: ReadonlySet<SpindleCapability>,
): ReadonlySet<SpindleCapability> {
  if (!isCapabilityBlockingTemporarilyRelaxed()) return declared;
  return new Set([...declared, ...TEMPORARILY_RELAXED_CAPABILITIES]);
}
