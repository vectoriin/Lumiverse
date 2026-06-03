import type { WeaverVisualAsset, WeaverVisualProvider } from "../../../types/weaver";
import type { ImageGenConnectionProfile } from "../../../types/image-gen-connection";
import type { ImageGenRequest } from "../../../image-gen/types";

export interface VisualAdapterBuildResult {
  request: ImageGenRequest;
  settingsSnapshot: Record<string, unknown>;
}

export interface VisualProviderAdapter {
  provider: WeaverVisualProvider;
  supportsWorkflowImport: boolean;
  supportsAdvancedMode: boolean;
  validate(
    asset: WeaverVisualAsset,
    connection: ImageGenConnectionProfile,
    apiKey?: string,
  ): Promise<string[]>;
  build(
    asset: WeaverVisualAsset,
    connection: ImageGenConnectionProfile,
    apiKey?: string,
  ): Promise<VisualAdapterBuildResult>;
}
