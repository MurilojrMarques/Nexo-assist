export type Priority = "Crítica" | "Alta" | "Média" | "Baixa";

export const priorityDotClass: Record<Priority, string> = {
  Crítica: "bg-danger",
  Alta: "bg-warning",
  Média: "bg-muted",
  Baixa: "bg-ink/25",
};
