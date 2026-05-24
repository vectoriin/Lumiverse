import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface AudioSegment {
  data: Uint8Array | Buffer;
  mime_type: string;
}

export interface MuxResult {
  data: Buffer;
  mime_type: string;
  /** True when ffmpeg was used; false when we fell back to naive byte-concat. */
  muxed_with_ffmpeg: boolean;
}

let ffmpegAvailability: boolean | null = null;

/**
 * Check whether `ffmpeg` is present on PATH. Cached after the first call so
 * subsequent muxes don't re-spawn a probe per request. Force re-detection by
 * calling `resetFfmpegProbe()` (used in tests).
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailability !== null) return ffmpegAvailability;
  try {
    const proc = Bun.spawn(["ffmpeg", "-version"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const code = await proc.exited;
    ffmpegAvailability = code === 0;
  } catch {
    ffmpegAvailability = false;
  }
  return ffmpegAvailability;
}

export function resetFfmpegProbe(): void {
  ffmpegAvailability = null;
}

function extForMime(mime: string): string {
  switch ((mime || "").toLowerCase()) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/ogg":
    case "audio/ogg; codecs=opus":
    case "audio/opus":
      return "ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/webm":
      return "webm";
    case "audio/aac":
      return "aac";
    case "audio/flac":
      return "flac";
    default:
      return "bin";
  }
}

function isMp3Mime(mime: string): boolean {
  const m = (mime || "").toLowerCase();
  return m === "audio/mpeg" || m === "audio/mp3";
}

/**
 * Naive byte-concatenation of MP3 frame streams. MP3 frames are
 * self-synchronizing so a player will recover seek/sync at each segment
 * boundary, but the result lacks a proper container-level seek table.
 * Acceptable as a fallback when ffmpeg isn't installed. Errors loudly when
 * non-MP3 inputs are mixed in — callers should keep ffmpeg available for
 * heterogeneous segments.
 */
function naiveConcatMp3(segments: AudioSegment[]): Buffer {
  for (const seg of segments) {
    if (!isMp3Mime(seg.mime_type)) {
      throw new Error(
        `naive concat fallback only supports audio/mpeg segments; got ${seg.mime_type}. Install ffmpeg (Termux: pkg install ffmpeg) for multi-format support.`,
      );
    }
  }
  return Buffer.concat(segments.map((s) => (s.data instanceof Buffer ? s.data : Buffer.from(s.data))));
}

/**
 * Quote a path for an ffmpeg concat-demuxer list file. The format expects
 * `file 'path'` with single quotes; literal single quotes inside the path
 * are escaped per ffmpeg's quoting rules (close, escaped backslash-quote,
 * reopen).
 */
function quoteConcatPath(p: string): string {
  return p.replace(/'/g, "'\\''");
}

async function runFfmpeg(args: string[]): Promise<{ ok: boolean; stderr: string }> {
  const proc = Bun.spawn(["ffmpeg", "-hide_banner", "-loglevel", "error", ...args], {
    stdout: "ignore",
    stderr: "pipe",
  });
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { ok: code === 0, stderr };
}

async function muxWithFfmpeg(segments: AudioSegment[]): Promise<Buffer> {
  const workdir = mkdtempSync(join(tmpdir(), "tts-mux-"));
  try {
    const segmentPaths: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const ext = extForMime(seg.mime_type);
      const segPath = join(workdir, `seg_${i.toString().padStart(4, "0")}.${ext}`);
      const buf = seg.data instanceof Buffer ? seg.data : Buffer.from(seg.data);
      writeFileSync(segPath, buf);
      segmentPaths.push(segPath);
    }

    const listPath = join(workdir, "concat.txt");
    writeFileSync(
      listPath,
      segmentPaths.map((p) => `file '${quoteConcatPath(p)}'`).join("\n") + "\n",
    );

    const outPath = join(workdir, `out.mp3`);

    // First attempt: copy codec. Works when every segment is the same codec
    // and stream parameters. Avoids transcoding cost and quality loss.
    let result = await runFfmpeg([
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      "-y",
      outPath,
    ]);

    if (!result.ok) {
      // Retry with re-encode to MP3 — handles codec/sample-rate mismatches
      // between providers (e.g. mixing OpenAI MP3 with ElevenLabs MP3 at a
      // different bitrate, or any non-MP3 input).
      result = await runFfmpeg([
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        "-ar", "44100",
        "-y",
        outPath,
      ]);
      if (!result.ok) {
        throw new Error(`ffmpeg mux failed: ${result.stderr.trim().slice(0, 500)}`);
      }
    }

    if (!existsSync(outPath)) {
      throw new Error("ffmpeg mux produced no output file");
    }

    const data = await Bun.file(outPath).bytes();
    return Buffer.from(data);
  } finally {
    // Force-remove the tmp dir even if a segment write or ffmpeg invocation
    // threw — leaving these around fills /tmp on long-running servers.
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup failure */
    }
  }
}

/**
 * Combine N TTS segment buffers into a single playable audio file.
 *
 *   • 1 segment       → passthrough, no work.
 *   • N segments + ffmpeg present → concat demuxer with codec copy, then
 *     re-encode fallback on stream-parameter mismatch. Result is always MP3.
 *   • N segments + no ffmpeg → naive MP3 frame byte-concat (MP3-only). Throws
 *     loudly on non-MP3 mixes so the caller can degrade gracefully (e.g. fail
 *     persistence and keep playing the ephemeral segments).
 *
 * The result mime is `audio/mpeg` after a real mux even if some inputs were
 * other formats — we standardize on MP3 since it's the dominant TTS provider
 * output and Web Audio plays it everywhere.
 */
export async function muxSegments(segments: AudioSegment[]): Promise<MuxResult> {
  if (segments.length === 0) {
    throw new Error("muxSegments requires at least one segment");
  }
  if (segments.length === 1) {
    const seg = segments[0]!;
    return {
      data: seg.data instanceof Buffer ? seg.data : Buffer.from(seg.data),
      mime_type: seg.mime_type || "audio/mpeg",
      muxed_with_ffmpeg: false,
    };
  }

  const hasFfmpeg = await isFfmpegAvailable();
  if (hasFfmpeg) {
    const data = await muxWithFfmpeg(segments);
    return { data, mime_type: "audio/mpeg", muxed_with_ffmpeg: true };
  }

  const data = naiveConcatMp3(segments);
  return { data, mime_type: "audio/mpeg", muxed_with_ffmpeg: false };
}
