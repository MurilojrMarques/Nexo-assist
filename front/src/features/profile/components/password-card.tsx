"use client";

import { useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

type PasswordCardProps = {
  email: string;
  passwordUpdated: string;
};

export function PasswordCard({ email, passwordUpdated }: PasswordCardProps) {
  const [linkSent, setLinkSent] = useState(false);

  return (
    <section
      aria-labelledby="password-title"
      className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <div className="flex flex-wrap items-center gap-3 px-[18px] py-4">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="password-title" className="text-[14.5px] font-semibold text-ink">
            Senha
          </h2>
          <p className="text-[13.5px] text-muted">Alterada {passwordUpdated}</p>
        </div>
        <button
          type="button"
          disabled={linkSent}
          onClick={() => setLinkSent(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_#1b24310d] outline outline-ink/12 enabled:hover:bg-surface disabled:cursor-default disabled:text-muted"
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {linkSent ? "Link enviado" : "Redefinir senha"}
        </button>
      </div>

      <p role="status" className="flex items-center gap-2 border-t border-line bg-surface px-[18px] py-2.5 text-[12.5px] text-muted">
        <Mail aria-hidden="true" className="size-3.5 shrink-0" />
        {linkSent
          ? `Link enviado para ${email}. Confira sua caixa de entrada.`
          : `Enviaremos um link de redefinição para ${email}.`}
      </p>
    </section>
  );
}
