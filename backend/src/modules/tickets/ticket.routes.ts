import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../http/middlewares/authenticate.js";
import type { TicketReader } from "./ticket.types.js";

const employeeParamsSchema = z.object({ employeeId: z.uuid() }).strict();

export function createEmployeeTicketRoutes(tickets: TicketReader): Router {
  const router = Router();

  router.get("/tickets", async (req, res) => {
    const { userId } = requireAuth(req);
    res.json({ tickets: await tickets.listByRequester(userId) });
  });

  return router;
}

export function createSupportTicketRoutes(tickets: TicketReader): Router {
  const router = Router();

  router.get("/employees/:employeeId/tickets", async (req, res) => {
    const { employeeId } = employeeParamsSchema.parse(req.params);
    res.json({ tickets: await tickets.listByRequester(employeeId) });
  });

  return router;
}
