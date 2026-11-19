import { Headset } from "lucide-react";

type HandoffNoticeProps = {
  team: string;
  reason: string;
};

export function HandoffNotice({ team, reason }: HandoffNoticeProps) {
  return (
    <p
      role="status"
      className="flex w-full items-center gap-2 rounded-xl bg-warning/8 px-3.5 py-2.5 text-[13.5px] text-warning-ink sm:w-[76.92%]"
    >
      <Headset aria-hidden="true" className="size-4 shrink-0" />
      <span>
        Transferido para <strong className="font-semibold">{team}</strong> · {reason}
      </span>
    </p>
  );
}
