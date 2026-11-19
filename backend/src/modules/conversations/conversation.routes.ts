import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { requireAuth } from "../../http/middlewares/authenticate.js";
import { SseStream } from "../../http/sse.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { ConversationService } from "./conversation.service.js";

const conversationParams = z.object({ conversationId: z.uuid() }).strict();
const draftParams = z.object({ conversationId: z.uuid(), draftId: z.uuid() }).strict();
const messageBody = z.object({ content: z.string().trim().min(1).max(2000) }).strict();
const supportQuery = z.object({ filter: z.enum(["all", "waiting", "with_agent", "mine"]).default("all") }).strict();

export function createEmployeeConversationRoutes(conversations: ConversationService, messageLimiter: RequestHandler): Router {
  const router = Router();

  router.post("/conversations", async (req, res) => {
    const { userId } = requireAuth(req);
    res.status(201).json({ conversation: await conversations.start(userId) });
  });

  router.get("/conversations", async (req, res) => {
    const { userId } = requireAuth(req);
    res.json({ conversations: await conversations.listForEmployee(userId) });
  });

  router.get("/conversations/:conversationId", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    res.json({ conversation: await conversations.getForEmployee(conversationId, userId) });
  });

  router.post("/conversations/:conversationId/messages", messageLimiter, async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    const { content } = messageBody.parse(req.body);
    const stream = new SseStream(res);

    try {
      await conversations.sendEmployeeMessage(conversationId, userId, content, (event) => stream.send(event));
    } catch (error) {
      if (!stream.started) {
        throw error;
      }

      if (!(error instanceof AppError)) {
        req.log.error({ err: error }, "Falha no turno da conversa");
      }

      stream.send({
        type: "error",
        code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
        message: error instanceof AppError ? error.message : "Erro interno do servidor.",
      });
    } finally {
      stream.end();
    }
  });

  router.post("/conversations/:conversationId/drafts/:draftId/confirm", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId, draftId } = draftParams.parse(req.params);
    res.json({ conversation: await conversations.confirmDraft(conversationId, userId, draftId) });
  });

  router.post("/conversations/:conversationId/drafts/:draftId/cancel", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId, draftId } = draftParams.parse(req.params);
    res.json({ conversation: await conversations.cancelDraft(conversationId, userId, draftId) });
  });

  return router;
}

export function createSupportConversationRoutes(conversations: ConversationService): Router {
  const router = Router();

  router.get("/conversations", async (req, res) => {
    const { userId } = requireAuth(req);
    const { filter } = supportQuery.parse(req.query);
    res.json({ conversations: await conversations.listForSupport(filter, userId) });
  });

  router.get("/conversations/:conversationId", async (req, res) => {
    const { conversationId } = conversationParams.parse(req.params);
    res.json({ conversation: await conversations.getForSupport(conversationId) });
  });

  router.post("/conversations/:conversationId/assume", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    res.json({ conversation: await conversations.assume(conversationId, userId) });
  });

  router.post("/conversations/:conversationId/messages", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    const { content } = messageBody.parse(req.body);
    res.status(201).json({ message: await conversations.sendAnalystMessage(conversationId, userId, content) });
  });

  router.post("/conversations/:conversationId/return-to-agent", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    res.json({ conversation: await conversations.returnToAgent(conversationId, userId) });
  });

  router.post("/conversations/:conversationId/close", async (req, res) => {
    const { userId } = requireAuth(req);
    const { conversationId } = conversationParams.parse(req.params);
    res.json({ conversation: await conversations.close(conversationId, userId) });
  });

  return router;
}
