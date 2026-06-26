import { join } from "node:path";
import { bunCmd } from "../utils/bun-cmd";
import type {
  ChatChunkVectorizationBatchResult,
  ChatChunkVectorizationTask,
} from "./chat-chunk-vectorization-runner";

type HostToSubprocessMessage =
  | { type: "process_batch"; requestId: string; tasks: ChatChunkVectorizationTask[] }
  | { type: "shutdown" };

type SubprocessToHostMessage =
  | { type: "ready" }
  | { type: "result"; requestId: string; result: ChatChunkVectorizationBatchResult }
  | { type: "error"; requestId?: string; error: string; name?: string; stack?: string };

type PendingBatch = {
  requestId: string;
  tasks: ChatChunkVectorizationTask[];
  resolve: (result: ChatChunkVectorizationBatchResult) => void;
  reject: (err: unknown) => void;
  timeout: ReturnType<typeof setTimeout> | null;
};

const READY_TIMEOUT_MS = 30_000;
const BATCH_TIMEOUT_MS = 15 * 60_000;
let warnedDisabled = false;

let subprocess: ReturnType<typeof Bun.spawn> | null = null;
let ready = false;
let starting: Promise<void> | null = null;
let resolveStarting: (() => void) | null = null;
let rejectStarting: ((reason?: unknown) => void) | null = null;
let inflight: PendingBatch | null = null;
const queue: PendingBatch[] = [];
let expectedExit = false;
let shutdownRequested = false;

function buildLaunchError(exitCode: number | null, signalCode: number | null, error?: Error): Error {
  return new Error(
    error?.message
      || `Chat chunk vectorization subprocess exited (code=${exitCode ?? "null"}, signal=${signalCode ?? "null"})`,
  );
}

function clearStarting(error?: unknown): void {
  const reject = rejectStarting;
  const resolve = resolveStarting;
  starting = null;
  resolveStarting = null;
  rejectStarting = null;
  if (error) reject?.(error);
  else resolve?.();
}

function clearInflightTimeout(item: PendingBatch | null): void {
  if (item?.timeout) {
    clearTimeout(item.timeout);
    item.timeout = null;
  }
}

function rejectQueued(error: Error): void {
  while (queue.length > 0) {
    queue.shift()!.reject(error);
  }
}

function failInflight(error: Error): void {
  const item = inflight;
  if (!item) return;
  inflight = null;
  clearInflightTimeout(item);
  item.reject(error);
}

function handleExit(exitCode: number | null, signalCode: number | null, error?: Error): void {
  const wasExpected = expectedExit;
  const wasShutdown = shutdownRequested;
  const launchError = buildLaunchError(exitCode, signalCode, error);
  subprocess = null;
  ready = false;
  expectedExit = false;
  shutdownRequested = false;
  clearStarting(launchError);
  failInflight(launchError);
  if (!wasExpected) {
    console.warn("[vectorization] Chat chunk subprocess exited unexpectedly:", launchError.message);
  }
  if (!wasShutdown && queue.length > 0) {
    pumpQueue();
  }
}

function handleMessage(message: SubprocessToHostMessage): void {
  if (!message) return;

  if (message.type === "ready") {
    ready = true;
    clearStarting();
    pumpQueue();
    return;
  }

  if (message.type === "error" && !message.requestId) {
    const err = new Error(message.error);
    err.name = message.name || "ChatChunkVectorizationSubprocessError";
    if (message.stack) err.stack = message.stack;
    clearStarting(err);
    return;
  }

  if (!inflight || !("requestId" in message) || message.requestId !== inflight.requestId) {
    return;
  }

  const item = inflight;
  inflight = null;
  clearInflightTimeout(item);

  if (message.type === "result") {
    item.resolve(message.result);
  } else {
    const err = new Error(message.error);
    err.name = message.name || "ChatChunkVectorizationSubprocessError";
    if (message.stack) err.stack = message.stack;
    item.reject(err);
  }

  pumpQueue();
}

function ensureSubprocess(): Promise<void> {
  if (subprocess && ready) return Promise.resolve();
  if (starting) return starting;

  starting = new Promise<void>((resolve, reject) => {
    resolveStarting = resolve;
    rejectStarting = reject;
  });

  const runtimePath = join(import.meta.dir, "chat-chunk-vectorization-subprocess.ts");
  const launchTimeout = setTimeout(() => {
    const err = new Error(`Chat chunk vectorization subprocess did not become ready within ${READY_TIMEOUT_MS}ms`);
    if (subprocess) {
      expectedExit = true;
      try {
        subprocess.kill("SIGKILL");
      } catch {
        /* noop */
      }
    }
    clearStarting(err);
  }, READY_TIMEOUT_MS);

  subprocess = Bun.spawn({
    cmd: bunCmd(runtimePath),
    env: process.env,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    serialization: "advanced",
    ipc(message) {
      if (ready) {
        handleMessage(message as SubprocessToHostMessage);
        return;
      }
      clearTimeout(launchTimeout);
      handleMessage(message as SubprocessToHostMessage);
    },
    onExit(_subprocess, exitCode, signalCode, error) {
      clearTimeout(launchTimeout);
      handleExit(exitCode, signalCode, error);
    },
  });

  return starting.finally(() => {
    clearTimeout(launchTimeout);
  });
}

function dispatch(item: PendingBatch): void {
  if (!subprocess) {
    item.reject(new Error("Chat chunk vectorization subprocess is not running"));
    return;
  }

  inflight = item;
  item.timeout = setTimeout(() => {
    const err = new Error(`Chat chunk vectorization batch timed out after ${Math.floor(BATCH_TIMEOUT_MS / 1000)}s`);
    console.warn("[vectorization] Chat chunk subprocess batch timed out; restarting subprocess");
    expectedExit = true;
    try {
      subprocess?.kill("SIGKILL");
    } catch {
      /* noop */
    }
    failInflight(err);
  }, BATCH_TIMEOUT_MS);
  try {
    subprocess.send({
      type: "process_batch",
      requestId: item.requestId,
      tasks: item.tasks,
    } satisfies HostToSubprocessMessage);
  } catch (err) {
    inflight = null;
    clearInflightTimeout(item);
    item.reject(err);
    expectedExit = true;
    try {
      subprocess.kill("SIGKILL");
    } catch {
      /* noop */
    }
  }
}

function pumpQueue(): void {
  if (inflight || queue.length === 0) return;
  void ensureSubprocess().then(
    () => {
      if (inflight || queue.length === 0 || !ready) return;
      const item = queue.shift()!;
      dispatch(item);
    },
    (err) => {
      const item = queue.shift();
      if (item) item.reject(err);
    },
  );
}

export function canUseChatChunkVectorizationSubprocess(): boolean {
  return process.env.LUMIVERSE_CHAT_VECTORIZATION_SUBPROCESS !== "false";
}

export function warnChatChunkVectorizationFallback(): void {
  if (warnedDisabled || canUseChatChunkVectorizationSubprocess()) return;
  warnedDisabled = true;
  console.warn(
    "[vectorization] Chat chunk vectorization subprocess disabled via LUMIVERSE_CHAT_VECTORIZATION_SUBPROCESS=false; falling back to in-process execution.",
  );
}

export function processChatChunkVectorizationBatchInSubprocess(
  tasks: ChatChunkVectorizationTask[],
): Promise<ChatChunkVectorizationBatchResult> {
  return new Promise((resolve, reject) => {
    queue.push({
      requestId: crypto.randomUUID(),
      tasks,
      resolve,
      reject,
      timeout: null,
    });
    pumpQueue();
  });
}

export function shutdownChatChunkVectorizationSubprocess(): void {
  const shutdownError = new Error("Chat chunk vectorization subprocess is shutting down");
  shutdownRequested = true;
  expectedExit = true;
  rejectQueued(shutdownError);
  failInflight(shutdownError);
  if (!subprocess) {
    shutdownRequested = false;
    expectedExit = false;
    return;
  }
  try {
    subprocess.send({ type: "shutdown" } satisfies HostToSubprocessMessage);
  } catch {
    try {
      subprocess.kill("SIGTERM");
    } catch {
      /* noop */
    }
  }
}
