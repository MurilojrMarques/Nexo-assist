import { getInitials } from "@/lib/get-initials";
import { avatarTone } from "./avatar-tone";

const sizes = {
  sm: "size-[34px] text-[12.5px]",
  md: "size-10 text-[13.5px]",
};

type AvatarProps = {
  name: string;
  size?: keyof typeof sizes;
  tone?: "auto" | "brand";
  online?: boolean;
};

export function Avatar({ name, size = "md", tone = "auto", online = false }: AvatarProps) {
  const color = tone === "brand" ? "bg-accent/7 text-link" : avatarTone(name);

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${color}`}
    >
      {getInitials(name)}
      {online && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-success" />
      )}
    </span>
  );
}
