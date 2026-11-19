type UserMessageProps = {
  text: string;
};

export function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <p className="max-w-full rounded-[12px_12px_4px_12px] bg-ink px-4 py-[11px] text-[14.5px]/[21px] text-white sm:max-w-[66.67%]">
        {text}
      </p>
    </div>
  );
}
