"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { isApiError } from "@/lib/api/api-error";
import type { ApiConversation, ConversationApi } from "@/features/chat/api/conversation-api";
import { chatReducer, initialChatState } from "@/features/chat/lib/chat-state";
import { isLimitReached } from "@/features/chat/lib/session-usage";

export const ANALYST_POLL_MS = 5_000;

const FALLBACK_ERROR = "Não consegui falar com o assistente agora. Tente de novo em instantes.";

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : FALLBACK_ERROR;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useConversation(api: ConversationApi) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [draftInFlight, setDraftInFlight] = useState<string | null>(null);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;

    api
      .latest()
      .then((conversation) => active && dispatch({ type: "loaded", conversation }))
      .catch((error: unknown) => active && dispatch({ type: "load-failed", message: errorMessage(error) }));

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [api]);

  const waitingForAnalyst = state.status === "WAITING_ANALYST" || state.status === "WITH_ANALYST";

  useEffect(() => {
    const conversationId = state.conversationId;

    if (!waitingForAnalyst || !conversationId) {
      return;
    }

    const timer = setInterval(() => {
      api
        .get(conversationId)
        .then((conversation) => dispatch({ type: "replaced", conversation }))
        .catch(() => undefined);
    }, ANALYST_POLL_MS);

    return () => clearInterval(timer);
  }, [api, waitingForAnalyst, state.conversationId]);

  const send = useCallback(
    async (text: string) => {
      const current = stateRef.current;

      if (current.busy || current.loading || isLimitReached(current.usage)) {
        return;
      }

      const localId = `local-${crypto.randomUUID()}`;
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "sent", localId, text });

      try {
        let conversationId = current.conversationId;

        if (!conversationId || current.status === "CLOSED") {
          const conversation = await api.start();
          dispatch({ type: "started", conversation });
          conversationId = conversation.id;
        }

        await api.send(conversationId, text, (event) => dispatch({ type: "event", event }), controller.signal);
        dispatch({ type: "finished" });
      } catch (error) {
        if (!isAbort(error)) {
          dispatch({ type: "failed", localId, message: errorMessage(error) });
        }
      }
    },
    [api],
  );

  const settleDraft = useCallback(
    async (draftId: string, settle: (conversationId: string, draftId: string) => Promise<ApiConversation>) => {
      const conversationId = stateRef.current.conversationId;

      if (!conversationId || stateRef.current.busy) {
        return;
      }

      setDraftInFlight(draftId);
      dispatch({ type: "error", message: null });

      try {
        dispatch({ type: "replaced", conversation: await settle(conversationId, draftId) });
      } catch (error) {
        dispatch({ type: "error", message: errorMessage(error) });
        await api
          .get(conversationId)
          .then((conversation) => dispatch({ type: "replaced", conversation }))
          .catch(() => undefined);
      } finally {
        setDraftInFlight(null);
      }
    },
    [api],
  );

  const confirmDraft = useCallback((draftId: string) => settleDraft(draftId, api.confirmDraft), [api, settleDraft]);
  const cancelDraft = useCallback((draftId: string) => settleDraft(draftId, api.cancelDraft), [api, settleDraft]);
  const dismissError = useCallback(() => dispatch({ type: "error", message: null }), []);

  return { ...state, draftInFlight, send, confirmDraft, cancelDraft, dismissError };
}
