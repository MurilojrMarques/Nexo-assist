"use client";

import { useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { ArrowUp } from "lucide-react";
import { formatUsage, isLimitReached, type SessionUsage } from "@/features/chat/lib/session-usage";

export const MESSAGE_MAX_LENGTH = 2000;

export type ComposerHandle = {
  focusWith: (text: string) => void;
};

type ComposerProps = {
  usage: SessionUsage;
  busy?: boolean;
  onSend: (text: string) => void;
  ref?: Ref<ComposerHandle>;
};

export function Composer({ usage, busy = false, onSend, ref }: ComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const limitReached = isLimitReached(usage);

  useImperativeHandle(ref, () => ({
    focusWith(value: string) {
      setText(value);
      inputRef.current?.focus();
    },
  }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();

    if (!message || limitReached || busy) {
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
          ref={inputRef}
          id="composer-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={limitReached}
          maxLength={MESSAGE_MAX_LENGTH}
          autoComplete="off"
          placeholder={limitReached ? "Limite de mensagens desta sessão atingido" : "Escreva para o Nexo…"}
          className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={limitReached || busy}
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
