"use client";

import { useSession } from "@/features/auth/session/session-provider";
import {
  mockConversations,
  mockEmployeeTickets,
  mockThreads,
} from "@/features/console/mock/console-data";
import { ConsoleView } from "./console-view";

export function ConsoleScreen() {
  const { user } = useSession();

  if (!user) {
    return null;
  }

  return (
    <ConsoleView
      analyst={{ name: user.name, email: user.email, team: user.team ?? "Service desk" }}
      initialConversations={mockConversations}
      initialThreads={mockThreads}
      ticketsByConversation={mockEmployeeTickets}
    />
  );
}
