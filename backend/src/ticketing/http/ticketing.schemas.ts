import { z } from "zod";
import {
  affectedScopes,
  ticketCategories,
  ticketPriorities,
  ticketTypes,
} from "../../domain/service-desk/types.js";

export const requesterQuerySchema = z
  .object({
    requesterId: z.uuid(),
    status: z.enum(["open", "all"]).default("all"),
  })
  .strict();

export const relatedQuerySchema = z
  .object({
    requesterId: z.uuid(),
    category: z.enum(ticketCategories),
  })
  .strict();

export const ticketCodeSchema = z.object({ code: z.string().regex(/^(INC|REQ)-\d{5,}$/) }).strict();

export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,80}$/, "Idempotency-Key inválida.");

const text = (max: number) => z.string().trim().min(1).max(max);

export const createTicketSchema = z
  .object({
    requesterId: z.uuid(),
    type: z.enum(ticketTypes),
    category: z.enum(ticketCategories),
    priority: z.enum(ticketPriorities),
    affectedScope: z.enum(affectedScopes),
    title: text(160),
    description: text(4000),
  })
  .strict();

export const commentSchema = z.object({ requesterId: z.uuid(), comment: text(4000) }).strict();

export const reopenSchema = z.object({ requesterId: z.uuid(), reason: text(1000) }).strict();

export const transferSchema = z.object({ requesterId: z.uuid(), team: text(80), summary: text(2000) }).strict();
