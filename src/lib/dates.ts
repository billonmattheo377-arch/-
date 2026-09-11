import type { Anniversary } from "../types";

const DAY_MS = 86_400_000;

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseLocalDate(fromKey);
  const to = parseLocalDate(toKey);
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

export function nextOccurrence(dateKey: string, recurring: boolean, now = new Date()): string {
  if (!recurring) return dateKey;

  const source = parseLocalDate(dateKey);
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let candidate = new Date(current.getFullYear(), source.getMonth(), source.getDate());
  if (toDateKey(candidate) < toDateKey(current)) {
    candidate = new Date(current.getFullYear() + 1, source.getMonth(), source.getDate());
  }
  return toDateKey(candidate);
}

export interface AnniversaryDisplay {
  anniversary: Anniversary;
  nextDate: string;
  days: number;
  years: number;
  label: string;
}

export function describeAnniversary(
  anniversary: Anniversary,
  now = new Date(),
): AnniversaryDisplay {
  const today = todayKey(now);
  const nextDate = nextOccurrence(anniversary.anniversary_date, anniversary.recurring, now);
  const days = daysBetween(today, nextDate);

  if (!anniversary.recurring) {
    const elapsed = daysBetween(anniversary.anniversary_date, today);
    return {
      anniversary,
      nextDate,
      days,
      years: Math.max(0, elapsed),
      label: elapsed === 0 ? "就是今天" : elapsed > 0 ? `已经 ${elapsed} 天` : `还有 ${-elapsed} 天`,
    };
  }

  const original = parseLocalDate(anniversary.anniversary_date);
  const target = parseLocalDate(nextDate);
  const years = target.getFullYear() - original.getFullYear();
  return {
    anniversary,
    nextDate,
    days,
    years,
    label: days === 0 ? `今天是第 ${years} 年` : `还有 ${days} 天`,
  };
}

export function sortAnniversaries(
  anniversaries: Anniversary[],
  now = new Date(),
): AnniversaryDisplay[] {
  return anniversaries
    .map((item) => describeAnniversary(item, now))
    .sort((a, b) => {
      if (a.days !== b.days) return a.days - b.days;
      return a.anniversary.title.localeCompare(b.anniversary.title, "zh-CN");
    });
}

export function formatDate(value: string): string {
  const date = parseLocalDate(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
