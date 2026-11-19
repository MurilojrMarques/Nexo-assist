import type { Metadata } from "next";
import { ChatScreen } from "@/features/chat/components/chat-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Atendimento",
};

export default function ChatPage() {
  return (
    <>
      <h1 className="sr-only">Atendimento</h1>
      <ChatScreen />
    </>
  );
}
