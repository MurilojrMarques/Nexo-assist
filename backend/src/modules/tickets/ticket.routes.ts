import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../http/middlewares/authenticate.js";
import type { TicketGateway } from "./ticket.types.js";

const statusQuerySchema = z.object({ status: z.enum(["open", "all"]).default("all") }).strict();
const codeParamsSchema = z.object({ code: z.string().regex(/^(INC|REQ)-\d{5,}$/) }).strict();
const employeeParamsSchema = z.object({ employeeId: z.uuid() }).strict();

type TicketReader = Pick<TicketGateway, "listByRequester" | "getForRequester">;

export function createEmployeeTicketRoutes(tickets: TicketReader): Router {
  const router = Router();

  router.get("/tickets", async (req, res) => {
    const { userId } = requireAuth(req);
    const { status } = statusQuerySchema.parse(req.query);
    res.json({ tickets: await tickets.listByRequester(userId, status) });
  });

  router.get("/tickets/:code", async (req, res) => {
    const { userId } = requireAuth(req);
    const { code } = codeParamsSchema.parse(req.params);
    res.json({ ticket: await tickets.getForRequester(code, userId) });
  });

  return router;
}

export function createSupportTicketRoutes(tickets: TicketReader): Router {
  const router = Router();

  router.get("/employees/:employeeId/tickets", async (req, res) => {
    const { employeeId } = employeeParamsSchema.parse(req.params);
    const { status } = statusQuerySchema.parse(req.query);
    res.json({ tickets: await tickets.listByRequester(employeeId, status) });
  });

  return router;
}
