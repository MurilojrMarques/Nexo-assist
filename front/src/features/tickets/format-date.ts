const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function dateParts(iso: string) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );

  return {
    day: parts.day,
    month: MONTHS[Number(parts.month) - 1],
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function formatDay(iso: string): string {
  const { day, month } = dateParts(iso);
  return `${day} ${month}`;
}

export function formatDayTime(iso: string): string {
  const { day, month, time } = dateParts(iso);
  return `${day} ${month}, ${time}`;
}
