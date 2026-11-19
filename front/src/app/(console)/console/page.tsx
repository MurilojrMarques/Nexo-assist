import type { Metadata } from "next";
import { ConsoleView } from "@/features/console/components/console-view";
import {
  mockAnalyst,
  mockConversations,
  mockEmployeeTickets,
  mockThreads,
} from "@/features/console/mock/console-data";

export const metadata: Metadata = {
  title: "Conversas",
};

export default function ConsolePage() {
  return (
    <ConsoleView
      analyst={mockAnalyst}
      initialConversations={mockConversations}
      initialThreads={mockThreads}
      ticketsByConversation={mockEmployeeTickets}
    />
  );
}
