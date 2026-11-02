const timeZone = "America/New_York";

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Not synchronized yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `${formatted} ET`;
}

export function formatMoney(cents: number | null, currency = "USD"): string {
  if (cents === null) return "Price unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function messageTypeLabel(type: string): string {
  if (type === "BROADCAST" || type === "GHOST_PROMOTION") return `Broadcast (${type})`;
  if (type === "SINGLE_RECIPIENT") return "Direct message";
  return type;
}

export const STATUS_LABEL: Record<string, string> = {
  confirmed_purchase_overlap: "Confirmed purchase overlap",
  possible_duplicate_requiring_review: "Possible duplicate requiring review",
  no_known_purchase_overlap: "No known purchase overlap",
  incomplete_or_unsupported_history: "Incomplete or unsupported history",
};
