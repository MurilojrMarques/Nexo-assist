import type { ReactNode } from "react";
import { Lock } from "lucide-react";

type AccountDetailsCardProps = {
  name: string;
  email: string;
};

export function AccountDetailsCard({ name, email }: AccountDetailsCardProps) {
  return (
    <section
      aria-label="Dados da conta"
      className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_#1b24310d,0_6px_18px_#1b24310a] outline outline-ink/9"
    >
      <dl className="divide-y divide-line">
        <AccountRow label="Nome">{name}</AccountRow>
        <AccountRow
          label="E-mail corporativo"
          note={
            <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-normal text-muted">
              <Lock aria-hidden="true" className="size-3.5" />
              Gerenciado pela TI
            </span>
          }
        >
          {email}
        </AccountRow>
      </dl>
    </section>
  );
}

type AccountRowProps = {
  label: string;
  note?: ReactNode;
  children: ReactNode;
};

function AccountRow({ label, note, children }: AccountRowProps) {
  return (
    <div className="flex flex-col gap-1 px-[18px] py-[18px] sm:flex-row sm:items-center sm:gap-4">
      <dt className="shrink-0 text-[13.5px] text-muted sm:w-40">{label}</dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14.5px] font-medium text-ink">
        <span className="min-w-0 truncate">{children}</span>
        {note}
      </dd>
    </div>
  );
}
