export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const sliceMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (sliceMatch) return sliceMatch[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function isInvalidDateRange(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  return start.slice(0, 10) > end.slice(0, 10);
}

export function isDateWithinRange(dateISO: string, start?: string | null, end?: string | null): boolean {
  const day = dateISO.slice(0, 10);
  const from = start ? start.slice(0, 10) : null;
  const to = end ? end.slice(0, 10) : null;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function backendWeekdayToJs(weekday: number): number {
  return (weekday + 1) % 7;
}

export function jsWeekdayToBackend(weekday: number): number {
  return (weekday + 6) % 7;
}
