export function money(cents: number, currency = "COP"): string {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "COP" || currency === "CLP" ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

export function compact(cents: number): string {
  const v = cents / 100;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(Math.round(v));
}

export function num(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function date(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function dateTime(iso: string): string {
  return `${date(iso)} · ${time(iso)}`;
}

export function pct(n: number): string {
  return `${n}%`;
}
