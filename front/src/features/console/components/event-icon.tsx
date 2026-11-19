import { ArrowLeftRight, Bot, CircleCheck, Headset } from "lucide-react";
import type { ConsoleEvent } from "@/features/console/types";

const icons = {
  transfer: ArrowLeftRight,
  assume: Headset,
  return: Bot,
  close: CircleCheck,
};

type EventIconProps = {
  type: ConsoleEvent["type"];
  className?: string;
};

export function EventIcon({ type, className = "size-3.5" }: EventIconProps) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" className={`shrink-0 ${className}`} />;
}
