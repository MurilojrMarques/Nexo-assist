"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { formatUsage, isLimitReached, type SessionUsage } from "@/features/chat/lib/session-usage";

type ComposerProps = {
  usage: SessionUsage;
  onSend: (text: string) => void;
};

export function Composer({ usage, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const limitReached = isLimitReached(usage);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();

    if (!message || limitReached) {
      return;
    }

    onSend(message);
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 flex-col gap-1.5 px-4 pt-2.5 pb-[18px] md:px-[16.95%]">
      <div className="flex h-12 items-center gap-2 rounded-xl bg-white pr-1.5 pl-4 outline outline-ink/12 focus-within:outline-[1.5px] focus-within:outline-primary">
        <label htmlFor="composer-message" className="sr-only">
          Mensagem para o Nexo
        </label>
        <input
          id="composer-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={limitReached}
          autoComplete="off"
          placeholder={limitReached ? "Limite de mensagens desta sessão atingido" : "Escreva para o Nexo…"}
          className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={limitReached}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUp aria-hidden="true" className="size-3.5" />
          Enviar
        </button>
      </div>
      <p aria-live="polite" className="text-right text-[12.5px] text-muted">
        {formatUsage(usage)}
      </p>
    </form>
  );
}
