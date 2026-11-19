import type { ReactNode } from "react";
import { CheckCheck } from "lucide-react";
import type { ConsoleMessage as ConsoleMessageData } from "@/features/console/types";
import { describeEventInThread } from "@/features/console/lib/console-events";
import { EventIcon } from "./event-icon";

type ConsoleMessageProps = {
  message: ConsoleMessageData;
};

export function ConsoleMessage({ message }: ConsoleMessageProps) {
  switch (message.kind) {
    case "day":
      return (
        <div className="flex justify-center py-1">
          <span className="rounded-md bg-white px-2.5 py-1 text-[12px] text-ink-soft shadow-[0_1px_1px_#1b24310f]">
            {message.label}
          </span>
        </div>
      );
    case "event":
      return (
        <div className="flex items-center gap-3 py-1 text-[12.5px] text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-ink/10" />
          <span className="flex items-center gap-1.5 text-center">
            <EventIcon type={message.event.type} />
            {describeEventInThread(message.event)}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-ink/10" />
        </div>
      );
    case "employee":
      return (
        <div className="flex justify-start">
          <Bubble tone="bg-white" time={message.time}>
            {message.text}
          </Bubble>
        </div>
      );
    case "agent":
      return (
        <div className="flex flex-col items-end gap-1">
          <Sender name="Nexo Assist" tag="IA" tagTone="bg-accent/10 text-link" />
          <Bubble tone="bg-bubble-agent" time={message.time} read>
            {message.text}
          </Bubble>
        </div>
      );
    case "analyst":
      return (
        <div className="flex flex-col items-end gap-1">
          <Sender name={message.author} tag={message.team} tagTone="bg-success/12 text-success-ink" />
          <Bubble tone="bg-bubble-analyst" time={message.time} read>
            {message.text}
          </Bubble>
        </div>
      );
  }
}

type SenderProps = {
  name: string;
  tag: string;
  tagTone: string;
};

function Sender({ name, tag, tagTone }: SenderProps) {
  return (
    <p className="flex items-center gap-2 text-[12px] font-medium text-ink-soft">
      {name}
      <span className={`rounded px-1.5 py-px text-[11px] font-semibold ${tagTone}`}>{tag}</span>
    </p>
  );
}

type BubbleProps = {
  tone: string;
  time: string;
  read?: boolean;
  children: ReactNode;
};

function Bubble({ tone, time, read = false, children }: BubbleProps) {
  return (
    <div
      className={`flow-root max-w-[85%] rounded-xl px-3 py-2 text-[14.5px]/[22px] text-ink shadow-[0_1px_1px_#1b24310f] sm:max-w-[64%] ${tone}`}
    >
      <span className="whitespace-pre-wrap">{children}</span>
      <span className="float-right mt-1.5 ml-3 flex items-center gap-1 text-[11px]/none text-muted">
        {time}
        {read && <CheckCheck aria-hidden="true" className="size-3.5 text-link" />}
      </span>
    </div>
  );
}
