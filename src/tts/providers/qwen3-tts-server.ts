import type { TtsProvider } from "../provider";
import type { TtsProviderCapabilities } from "../param-schema";
import type { TtsRequest, TtsResponse, TtsVoice } from "../types";
import {
  QWEN_TTS_PROVIDER,
  parseQwenVoice,
  qwenApiBaseUrl,
  qwenSpeakerVoiceId,
  type QwenModelHealth,
} from "./qwen3-utils";
import { fetchProviderJson, ProviderRequestError, throwProviderResponseError } from "../../utils/provider-errors";

const QWEN_LANGUAGE_OPTIONS = [
  "Auto",
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Russian",
  "Portuguese",
  "Spanish",
  "Italian",
].map((language) => ({ id: language, label: language }));

interface QwenSpeakersResponse {
  speakers?: Array<{
    name?: string;
    native_language?: string;
  }>;
}

export class Qwen3TtsServerProvider implements TtsProvider {
  readonly name = QWEN_TTS_PROVIDER;
  readonly displayName = "Qwen3-TTS Server";

  readonly capabilities: TtsProviderCapabilities = {
    parameters: {
      language: {
        type: "select",
        default: "Auto",
        description: "Language routing for synthesis. Leave on Auto unless the server struggles to infer the target language.",
        options: QWEN_LANGUAGE_OPTIONS,
      },
      instruct: {
        type: "string",
        description: "Optional style instruction for built-in speakers (for example: 'Warm, whispered, close-mic').",
        group: "advanced",
      },
    },
    apiKeyRequired: true,
    voiceListStyle: "dynamic",
    modelListStyle: "static",
    staticModels: [
      { id: "auto", label: "Auto (speakers + saved clones)" },
    ],
    supportsStreaming: false,
    supportedFormats: ["wav", "base64"],
    defaultUrl: "http://localhost:8000",
    defaultFormat: "wav",
  };

  private headers(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-API-Key"] = apiKey;
    return headers;
  }

  private async modelHealth(apiUrl: string): Promise<QwenModelHealth> {
    return fetchProviderJson<QwenModelHealth>(
      this.displayName,
      "model health",
      `${qwenApiBaseUrl(apiUrl)}/health/models`,
      { headers: { Accept: "application/json" } },
    );
  }

  async synthesize(apiKey: string, apiUrl: string, request: TtsRequest): Promise<TtsResponse> {
    const parsedVoice = parseQwenVoice(request.voice || "");
    if (!parsedVoice) {
      throw new Error("Qwen3-TTS Server requires a voice selection");
    }

    const baseUrl = qwenApiBaseUrl(apiUrl);
    const responseFormat = request.outputFormat || this.capabilities.defaultFormat;
    const language = request.parameters.language || "Auto";
    let url = "";
    let body: Record<string, any>;

    if (parsedVoice.kind === "prompt") {
      url = `${baseUrl}/api/v1/base/generate-with-prompt`;
      body = {
        text: request.text,
        language,
        prompt_id: parsedVoice.promptId,
        response_format: responseFormat,
      };
    } else {
      url = `${baseUrl}/api/v1/custom-voice/generate`;
      body = {
        text: request.text,
        language,
        speaker: parsedVoice.speaker,
        speed: request.parameters.speed ?? 1.0,
        response_format: responseFormat,
      };
      if (request.parameters.instruct) {
        body.instruct = request.parameters.instruct;
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify(body),
      signal: request.signal,
    });

    if (!res.ok) await throwProviderResponseError(this.displayName, "tts synthesize", res);

    const audioData = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "audio/wav";

    return {
      audioData,
      contentType,
      model: request.model || "auto",
      provider: this.name,
    };
  }

  async *synthesizeStream(): AsyncGenerator<never, void, unknown> {
    throw new Error("Qwen3-TTS Server does not support streaming in Lumiverse yet");
  }

  async validateKey(apiKey: string, apiUrl: string): Promise<boolean> {
    try {
      const health = await this.modelHealth(apiUrl);
      const baseUrl = qwenApiBaseUrl(apiUrl);

      let probeUrl = "";
      if (health.custom_voice_loaded) {
        probeUrl = `${baseUrl}/api/v1/custom-voice/languages`;
      } else if (health.base_loaded) {
        probeUrl = `${baseUrl}/api/v1/base/cache/stats`;
      } else {
        throw new Error("No usable Qwen TTS models are loaded on the server");
      }

      const res = await fetch(probeUrl, { headers: this.headers(apiKey) });
      if (!res.ok) await throwProviderResponseError(this.displayName, "authentication", res);
      return true;
    } catch (err) {
      if (err instanceof ProviderRequestError) throw err;
      throw new ProviderRequestError({
        provider: this.displayName,
        operation: "authentication",
        detail: err instanceof Error ? err.message : "network request failed",
        retryable: true,
      });
    }
  }

  async listModels(_apiKey: string, _apiUrl: string): Promise<Array<{ id: string; label: string }>> {
    return this.capabilities.staticModels || [];
  }

  async listVoices(apiKey: string, apiUrl: string): Promise<TtsVoice[]> {
    const health = await this.modelHealth(apiUrl);
    if (!health.custom_voice_loaded) return [];

    const data = await fetchProviderJson<QwenSpeakersResponse>(
      this.displayName,
      "voice listing",
      `${qwenApiBaseUrl(apiUrl)}/api/v1/custom-voice/speakers`,
      { headers: this.headers(apiKey) },
    );

    const voices: TtsVoice[] = [];
    for (const speaker of data.speakers || []) {
      const name = typeof speaker?.name === "string" ? speaker.name.trim() : "";
      if (!name) continue;
      voices.push({
        id: qwenSpeakerVoiceId(name),
        name,
        language: typeof speaker?.native_language === "string" ? speaker.native_language : undefined,
      });
    }
    voices.sort((a, b) => a.name.localeCompare(b.name));
    return voices;
  }
}
