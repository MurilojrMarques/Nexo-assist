import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantStatus } from "@/features/chat/components/assistant-status";
import { ChatView } from "@/features/chat/components/chat-view";
import { getScenario } from "@/features/chat/mock/scenarios";

export const instant = false;

export const metadata: Metadata = {
  title: "Atendimento",
};

export default function ChatPage({ searchParams }: PageProps<"/chat">) {
  return (
    <>
      <h1 className="sr-only">Atendimento</h1>
      <PageHeader trail={["Service desk de TI"]} current="Atendimento" actions={<AssistantStatus />} />
      <Suspense fallback={<div className="flex-1" />}>
        <ScenarioChat searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ScenarioChat({ searchParams }: Pick<PageProps<"/chat">, "searchParams">) {
  const { cenario } = await searchParams;
  const scenario = getScenario(cenario);

  return <ChatView key={scenario.id} initialMessages={scenario.messages} initialUsage={scenario.usage} />;
}
