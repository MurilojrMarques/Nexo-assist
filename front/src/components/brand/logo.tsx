import { LogoMark } from "./logo-mark";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`flex h-6 w-[130px] items-center gap-2.5 ${className}`}>
      <LogoMark className="size-6" />
      <span className="text-[17px] font-bold tracking-[-0.2px] whitespace-nowrap">
        Nexo Assist
      </span>
    </span>
  );
}
