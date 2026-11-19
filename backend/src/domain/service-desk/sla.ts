import type { TicketPriority } from "./types.js";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const SAO_PAULO_OFFSET_MS = -3 * HOUR_MS;
const OPENING_HOUR = 8;
const CLOSING_HOUR = 18;

type SlaTarget =
  | { kind: "clock-hours"; amount: number; label: string }
  | { kind: "business-hours"; amount: number; label: string }
  | { kind: "business-days"; amount: number; label: string };

export const slaTargets: Record<TicketPriority, SlaTarget> = {
  CRITICAL: { kind: "clock-hours", amount: 1, label: "1 hora" },
  HIGH: { kind: "business-hours", amount: 4, label: "4 horas úteis" },
  MEDIUM: { kind: "business-days", amount: 3, label: "3 dias úteis" },
  LOW: { kind: "business-days", amount: 5, label: "5 dias úteis" },
};

function toLocal(date: Date): Date {
  return new Date(date.getTime() + SAO_PAULO_OFFSET_MS);
}

function fromLocal(local: Date): Date {
  return new Date(local.getTime() - SAO_PAULO_OFFSET_MS);
}

function atHour(local: Date, hour: number): Date {
  const result = new Date(local);
  result.setUTCHours(hour, 0, 0, 0);
  return result;
}

function isBusinessDay(local: Date): boolean {
  const weekday = local.getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function nextBusinessMoment(local: Date): Date {
  let current = new Date(local);

  while (true) {
    if (!isBusinessDay(current) || current >= atHour(current, CLOSING_HOUR)) {
      current = atHour(new Date(current.getTime() + DAY_MS), OPENING_HOUR);
      continue;
    }

    return current < atHour(current, OPENING_HOUR) ? atHour(current, OPENING_HOUR) : current;
  }
}

function addBusinessHours(local: Date, hours: number): Date {
  let remaining = hours * HOUR_MS;
  let current = nextBusinessMoment(local);

  while (true) {
    const available = atHour(current, CLOSING_HOUR).getTime() - current.getTime();

    if (remaining <= available) {
      return new Date(current.getTime() + remaining);
    }

    remaining -= available;
    current = nextBusinessMoment(atHour(current, CLOSING_HOUR));
  }
}

function addBusinessDays(local: Date, days: number): Date {
  let current = nextBusinessMoment(local);

  for (let added = 0; added < days; ) {
    current = new Date(current.getTime() + DAY_MS);

    if (isBusinessDay(current)) {
      added += 1;
    }
  }

  return current;
}

export function computeDueAt(priority: TicketPriority, from: Date): Date {
  const target = slaTargets[priority];

  switch (target.kind) {
    case "clock-hours":
      return new Date(from.getTime() + target.amount * HOUR_MS);
    case "business-hours":
      return fromLocal(addBusinessHours(toLocal(from), target.amount));
    case "business-days":
      return fromLocal(addBusinessDays(toLocal(from), target.amount));
  }
}
