import type { ConsoleEvent } from "@/features/console/types";

export function describeEventInThread(event: ConsoleEvent): string {
  switch (event.type) {
    case "transfer":
      return `Transferida para ${event.team} · ${event.time}`;
    case "assume":
      return `${event.actor} assumiu · agent pausado · ${event.time}`;
    case "return":
      return `${event.actor} devolveu ao agent · ${event.time}`;
    case "close":
      return `${event.actor} encerrou o atendimento · ${event.time}`;
  }
}

export function describeEventOnTicket(event: ConsoleEvent): string {
  switch (event.type) {
    case "transfer":
      return "Transferido para um analista";
    case "assume":
      return `Assumido por ${event.actor}`;
    case "return":
      return "Devolvido ao agent";
    case "close":
      return `Encerrado por ${event.actor}`;
  }
}
