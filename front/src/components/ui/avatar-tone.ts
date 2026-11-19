export const avatarTones = [
  "bg-[#dbe9fb] text-[#0069c7]",
  "bg-[#fbe5d6] text-[#b4541a]",
  "bg-[#e9e3fb] text-[#6b4fc8]",
  "bg-[#dff3e7] text-[#1f8a4c]",
  "bg-[#fbe1e6] text-[#c23a5a]",
  "bg-[#e6e8ec] text-[#3d4656]",
  "bg-[#fbefd0] text-[#9a6b00]",
];

export function avatarTone(name: string): string {
  let hash = 0;

  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  }

  return avatarTones[hash % avatarTones.length];
}
