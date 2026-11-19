"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/features/auth/session/session-provider";
import { createConversationApi, type ConversationApi } from "@/features/chat/api/conversation-api";
import { useConversation } from "@/features/chat/hooks/use-conversation";
import { AssistantStatus } from "./assistant-status";
import { ChatView } from "./chat-view";

type ChatScreenProps = {
  api?: ConversationApi;
};

export function ChatScreen({ api: injected }: ChatScreenProps) {
  const session = useSession();
  const [api] = useState(() => injected ?? createConversationApi(session));
  const conversation = useConversation(api);

  return (
    <>
      <PageHeader trail={["Service desk de TI"]} current="Atendimento" actions={<AssistantStatus status={conversation.status} />} />
      <ChatView
        messages={conversation.messages}
        usage={conversation.usage}
        loading={conversation.loading}
        busy={conversation.busy}
        error={conversation.error}
        draftInFlight={conversation.draftInFlight}
        onSend={conversation.send}
        onConfirmDraft={conversation.confirmDraft}
        onCancelDraft={conversation.cancelDraft}
        onDismissError={conversation.dismissError}
      />
    </>
  );
}
