import type { QuickReplyOption, ReplyOptions } from "@/features/chat/types";

type QuickRepliesProps = {
  replies: ReplyOptions;
  onSelect: (option: QuickReplyOption) => void;
};

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  const answered = replies.selected !== undefined;

  return (
    <div className="flex flex-col gap-3">
      {replies.prompt && <p className="text-[14.5px] font-semibold text-ink">{replies.prompt}</p>}
      <div role="group" aria-label={replies.prompt ?? "Opções de resposta"} className="flex flex-wrap gap-1.5">
        {replies.options.map((option) => {
          const selected = replies.selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={answered}
              aria-pressed={selected}
              onClick={() => onSelect(option)}
              className={`rounded-lg px-3 py-[7px] text-[13.5px] font-medium outline disabled:cursor-default ${
                selected
                  ? "bg-accent/7 text-link outline-accent"
                  : "bg-white text-ink outline-line enabled:hover:bg-surface"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
