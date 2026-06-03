import { Hono } from "hono";
import * as svc from "../services/weaver/session.service";
import * as extractionSvc from "../services/weaver/extraction.service";
import * as interviewSvc from "../services/weaver/interview.service";
import * as bibleSvc from "../services/weaver/bible.service";
import * as renderSvc from "../services/weaver/render.service";
import * as finalizeSvc from "../services/weaver/finalize.service";
import { SPINE_SLOTS } from "../services/weaver/slots";
import { FIELD_DEFS } from "../services/weaver/fields";
import { startWeaverVisualJob, getWeaverVisualJob } from "../services/weaver/visual/service";
import { isVisualKind, listVisualKinds, visualCandidateOwner } from "../services/weaver/visual/kinds";
import { suggestVisualTags, buildTagEvidenceFromCharacter } from "../services/weaver/visual/tag-suggester";
import { getCharacter, setCharacterAvatarFromImage } from "../services/characters.service";
import { getConnection, imageGenConnectionSecretKey } from "../services/image-gen-connections.service";
import { getImageGenSettings } from "../services/image-gen.service";
import * as imagesSvc from "../services/images.service";
import * as secretsSvc from "../services/secrets.service";
import type {
  CreateWeaverSessionInput,
  UpdateWeaverSessionInput,
  UpdateWeaverExtractionInput,
  GenerateQuestionInput,
  AnswerQuestionInput,
  UpdateWeaverBibleInput,
  RenderFieldsInput,
  EditWeaverFieldInput,
  AcceptWeaverFieldInput,
  NudgeWeaverFieldInput,
  WeaverVisualGenerateInput,
} from "../types/weaver";

const app = new Hono();

function publicWeaverError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("no connection")) return "Choose a text connection before running the Weaver.";
    if (err.message.includes("no model")) return "Choose a model before running the Weaver.";
    if (err.message === "Seed is empty — nothing to read back") return err.message;
    if (err.message === "Read the dream first — there is nothing to synthesize") return err.message;
    if (err.message.includes("invalid JSON")) return "The model's response could not be parsed. Try again or switch models.";
    if (err.message.includes("no usable options")) return "The model returned no usable options. Try again or switch models.";
    if (err.message.includes("unusable Bible")) return "The model returned an unusable Bible. Try again or switch models.";
    if (err.message.startsWith("Synthesize a Bible first")) return err.message;
    if (err.message.startsWith("The Bible has no spine yet")) return err.message;
    if (err.message.startsWith("Unknown field")) return err.message;
    if (err.message.startsWith("This field is hand-edited")) return err.message;
    if (err.message.startsWith("Render the field first")) return err.message;
    if (err.message === "A field cannot be empty") return err.message;
    if (err.message === "Add a nudge to steer the re-render") return err.message;
    if (err.name === "AbortError" || err.message.toLowerCase().includes("abort")) return "Generation was canceled.";
  }
  return "That step could not finish. Check the connection and try again.";
}

app.post("/sessions", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as CreateWeaverSessionInput;
  const session = svc.createSession(userId, body);
  return c.json(session, 201);
});

app.get("/sessions", (c) => {
  const userId = c.get("userId");
  return c.json(svc.listSessions(userId));
});

app.get("/sessions/:id", (c) => {
  const userId = c.get("userId");
  const session = svc.getSession(userId, c.req.param("id"));
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json(session);
});

app.patch("/sessions/:id", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as UpdateWeaverSessionInput;
  try {
    const session = svc.updateSession(userId, c.req.param("id"), body);
    return c.json(session);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.delete("/sessions/:id", (c) => {
  const userId = c.get("userId");
  const deleted = svc.deleteSession(userId, c.req.param("id"));
  if (!deleted) return c.json({ error: "Session not found" }, 404);
  return c.json({ success: true });
});

app.get("/slots", (c) => c.json(SPINE_SLOTS));

app.get("/field-defs", (c) => c.json(FIELD_DEFS));

app.get("/sessions/:id/extraction", (c) => {
  const userId = c.get("userId");
  const extraction = extractionSvc.getExtraction(userId, c.req.param("id"));
  if (!extraction) return c.json({ error: "Extraction not found" }, 404);
  return c.json(extraction);
});

app.post("/sessions/:id/readback", async (c) => {
  const userId = c.get("userId");
  try {
    const extraction = await extractionSvc.runReadback(userId, c.req.param("id"));
    return c.json(extraction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Read-back failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.patch("/sessions/:id/extraction", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as UpdateWeaverExtractionInput;
  try {
    const extraction = extractionSvc.updateExtraction(userId, c.req.param("id"), body);
    return c.json(extraction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    if (message === "Extraction not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.get("/sessions/:id/interview", (c) => {
  const userId = c.get("userId");
  if (!svc.getSession(userId, c.req.param("id"))) return c.json({ error: "Session not found" }, 404);
  return c.json(interviewSvc.getInterviewState(userId, c.req.param("id")));
});

app.post("/sessions/:id/interview/question", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as GenerateQuestionInput;
  try {
    const question = await interviewSvc.generateQuestion(userId, c.req.param("id"), body);
    return c.json({ question });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Question generation failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/interview/answer", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as AnswerQuestionInput;
  try {
    const state = interviewSvc.answerQuestion(userId, c.req.param("id"), body);
    return c.json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Answer failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.post("/sessions/:id/interview/begin", (c) => {
  const userId = c.get("userId");
  try {
    return c.json(interviewSvc.beginInterview(userId, c.req.param("id")));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Begin failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.post("/sessions/:id/interview/complete", (c) => {
  const userId = c.get("userId");
  try {
    return c.json(interviewSvc.completeInterview(userId, c.req.param("id")));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Complete failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.post("/sessions/:id/interview/reset", (c) => {
  const userId = c.get("userId");
  try {
    const state = interviewSvc.resetInterview(userId, c.req.param("id"));
    return c.json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.get("/sessions/:id/bible", (c) => {
  const userId = c.get("userId");
  if (!svc.getSession(userId, c.req.param("id"))) return c.json({ error: "Session not found" }, 404);
  const bible = bibleSvc.getBible(userId, c.req.param("id"));
  if (!bible) return c.json({ error: "Bible not found" }, 404);
  return c.json(bible);
});

app.post("/sessions/:id/bible/synthesize", async (c) => {
  const userId = c.get("userId");
  try {
    const bible = await bibleSvc.synthesizeBible(userId, c.req.param("id"));
    return c.json(bible);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Synthesis failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/bible/gate", async (c) => {
  const userId = c.get("userId");
  try {
    const bible = await bibleSvc.gateBible(userId, c.req.param("id"));
    return c.json(bible);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check failed";
    if (message === "Session not found" || message === "No Bible to check yet")
      return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.patch("/sessions/:id/bible", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as UpdateWeaverBibleInput;
  try {
    const bible = bibleSvc.updateBible(userId, c.req.param("id"), body);
    return c.json(bible);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    if (message === "No Bible to edit yet") return c.json({ error: message }, 404);
    return c.json({ error: message }, 400);
  }
});

app.get("/sessions/:id/fields", (c) => {
  const userId = c.get("userId");
  if (!svc.getSession(userId, c.req.param("id"))) return c.json({ error: "Session not found" }, 404);
  return c.json(renderSvc.getFields(userId, c.req.param("id")));
});

app.post("/sessions/:id/fields/render", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as RenderFieldsInput;
  try {
    if (body.field_id) {
      const field = await renderSvc.renderField(userId, c.req.param("id"), body.field_id, { force: body.force });
      return c.json([field]);
    }
    const fields = await renderSvc.renderAllFields(userId, c.req.param("id"));
    return c.json(fields);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Render failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/fields/:field/render", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as RenderFieldsInput;
  try {
    const field = await renderSvc.reRenderField(userId, c.req.param("id"), c.req.param("field"), {
      force: body.force,
    });
    return c.json(field);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Render failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.patch("/sessions/:id/fields/:field", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as EditWeaverFieldInput;
  try {
    const field = renderSvc.editField(userId, c.req.param("id"), c.req.param("field"), body.content ?? "");
    return c.json(field);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Edit failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/fields/:field/accept", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as AcceptWeaverFieldInput;
  try {
    const field = renderSvc.acceptField(userId, c.req.param("id"), c.req.param("field"), body.accepted === true);
    return c.json(field);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Accept failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/fields/:field/nudge", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => ({}))) as NudgeWeaverFieldInput;
  try {
    const field = await renderSvc.reRenderWithNudge(userId, c.req.param("id"), c.req.param("field"), body.nudge ?? "", {
      force: body.force,
    });
    return c.json(field);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Nudge failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/finalize", async (c) => {
  const userId = c.get("userId");
  try {
    const result = finalizeSvc.finalizeSession(userId, c.req.param("id"));
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Finalize failed";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/start-chat", async (c) => {
  const userId = c.get("userId");
  try {
    const result = finalizeSvc.startChat(userId, c.req.param("id"));
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not start the chat";
    if (message === "Session not found") return c.json({ error: message }, 404);
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.get("/visual/kinds", (c) => c.json(listVisualKinds()));

function visualMacroValues(character: ReturnType<typeof getCharacter>): Record<string, string | undefined> {
  if (!character) return {};
  return {
    name: character.name ?? undefined,
    description: typeof character.description === "string" ? character.description : undefined,
  };
}

app.post("/sessions/:id/visual/generate", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as WeaverVisualGenerateInput;

  const session = svc.getSession(userId, sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "finalized" || !session.character_id) {
    return c.json({ error: "Finalize the character before generating visuals." }, 400);
  }
  if (!body.kind || !isVisualKind(body.kind)) {
    return c.json({ error: "Unknown image kind." }, 400);
  }
  if (!body.prompt?.trim()) {
    return c.json({ error: "A prompt is required." }, 400);
  }
  if (!body.connection_id) {
    return c.json({ error: "Choose an image connection." }, 400);
  }

  const character = getCharacter(userId, session.character_id);
  if (!character) return c.json({ error: "Character not found" }, 404);

  const connection = getConnection(userId, body.connection_id);
  if (!connection) return c.json({ error: "Image connection not found" }, 404);

  const apiKey = (await secretsSvc.getSecret(userId, imageGenConnectionSecretKey(connection.id))) ?? "";

  const timeoutSecs = getImageGenSettings(userId).generationTimeoutSeconds ?? 300;
  const controller = timeoutSecs > 0 ? new AbortController() : null;
  const timeoutHandle = controller
    ? setTimeout(() => controller.abort(new Error(`Visual generation timed out after ${timeoutSecs}s`)), timeoutSecs * 1000)
    : null;

  const characterId = session.character_id;
  const job = startWeaverVisualJob({
    userId,
    sessionId,
    characterId,
    input: body,
    connection,
    apiKey,
    macroValues: visualMacroValues(character),
    signal: controller?.signal,
    onSettled: timeoutHandle !== null ? () => clearTimeout(timeoutHandle) : undefined,
    persistResult: async ({ job, result }) => {
      if (!result.image_url || !result.image_url.startsWith("data:image/")) {
        return result;
      }
      const image = await imagesSvc.saveImageFromDataUrl(
        userId,
        result.image_url,
        `${imagesSvc.IMAGE_GEN_FILENAME_PREFIX}weaver-${characterId}-${job.kind}-${job.id}.png`,
        {
          owner_character_id: characterId,
          owner_extension_identifier: visualCandidateOwner(job.kind),
        },
      );
      return { ...result, image_id: image.id, image_url: undefined };
    },
  });

  return c.json(job, 201);
});

app.get("/sessions/:id/visual/job/:jobId", (c) => {
  const userId = c.get("userId");
  const job = getWeaverVisualJob(userId, c.req.param("jobId"));
  if (!job || job.sessionId !== c.req.param("id")) {
    return c.json({ error: "Job not found" }, 404);
  }
  return c.json(job);
});

app.get("/sessions/:id/visual/candidates", (c) => {
  const userId = c.get("userId");
  const kind = c.req.query("kind");
  if (!kind || !isVisualKind(kind)) {
    return c.json({ error: "Unknown image kind." }, 400);
  }
  const session = svc.getSession(userId, c.req.param("id"));
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (!session.character_id) return c.json({ data: [], total: 0 });

  const result = imagesSvc.listImages(userId, {
    owner_character_id: session.character_id,
    owner_extension_identifier: visualCandidateOwner(kind),
    limit: 200,
  });
  return c.json(result);
});

app.post("/sessions/:id/visual/suggest-tags", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("id");

  const session = svc.getSession(userId, sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "finalized" || !session.character_id) {
    return c.json({ error: "Finalize the character before suggesting tags." }, 400);
  }
  const character = getCharacter(userId, session.character_id);
  if (!character) return c.json({ error: "Character not found" }, 404);

  try {
    const evidence = buildTagEvidenceFromCharacter(character);
    const tags = await suggestVisualTags({ userId, session, evidence });
    return c.json(tags);
  } catch (err) {
    return c.json({ error: publicWeaverError(err) }, 400);
  }
});

app.post("/sessions/:id/visual/commit/avatar", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { image_id?: string };

  const session = svc.getSession(userId, sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);
  if (session.status !== "finalized" || !session.character_id) {
    return c.json({ error: "Finalize the character before committing visuals." }, 400);
  }
  if (!body.image_id) return c.json({ error: "image_id is required" }, 400);

  const character = setCharacterAvatarFromImage(userId, session.character_id, body.image_id);
  if (!character) return c.json({ error: "Image or character not found" }, 404);
  return c.json(character);
});

export { app as weaverRoutes };
