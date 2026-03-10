const dateTimeFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value?: string) {
  if (!value) {
    return "Sense data";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatPercent(value?: number) {
  if (value === undefined) {
    return "Sense valor";
  }

  return `${Math.round(value * 100)}%`;
}
