import { Router, type Request } from "express";
import type { TicketService } from "../ticket.service.js";
import {
  commentSchema,
  createTicketSchema,
  idempotencyKeySchema,
  relatedQuerySchema,
  reopenSchema,
  requesterQuerySchema,
  ticketCodeSchema,
  transferSchema,
} from "./ticketing.schemas.js";

function idempotencyKey(req: Request): string {
  return idempotencyKeySchema.parse(req.get("idempotency-key"));
}

export function createTicketingRoutes(service: TicketService): Router {
  const router = Router();

  router.get("/tickets", async (req, res) => {
    const { requesterId, status } = requesterQuerySchema.parse(req.query);
    res.json({ tickets: await service.list(requesterId, status) });
  });

  router.get("/tickets/related", async (req, res) => {
    const { requesterId, category } = relatedQuerySchema.parse(req.query);
    res.json(await service.related(requesterId, category));
  });

  router.get("/tickets/:code", async (req, res) => {
    const { code } = ticketCodeSchema.parse(req.params);
    const { requesterId } = requesterQuerySchema.parse(req.query);
    res.json({ ticket: await service.get(code, requesterId) });
  });

  router.post("/tickets", async (req, res) => {
    const command = createTicketSchema.parse(req.body);
    res.status(201).json({ ticket: await service.create(command, idempotencyKey(req)) });
  });

  router.post("/tickets/:code/comments", async (req, res) => {
    const { code } = ticketCodeSchema.parse(req.params);
    const { requesterId, comment } = commentSchema.parse(req.body);
    res.json({ ticket: await service.addComment(code, requesterId, comment, idempotencyKey(req)) });
  });

  router.post("/tickets/:code/reopen", async (req, res) => {
    const { code } = ticketCodeSchema.parse(req.params);
    const { requesterId, reason } = reopenSchema.parse(req.body);
    res.json({ ticket: await service.reopen(code, requesterId, reason, idempotencyKey(req)) });
  });

  router.post("/tickets/:code/transfer", async (req, res) => {
    const { code } = ticketCodeSchema.parse(req.params);
    const { requesterId, team, summary } = transferSchema.parse(req.body);
    res.json({ ticket: await service.transfer(code, requesterId, team, summary, idempotencyKey(req)) });
  });

  return router;
}
