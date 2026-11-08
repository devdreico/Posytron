import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger" | "tag";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const sizes = {
    sm: "h-8 px-3 text-[13px] rounded-md",
    md: "h-10 px-4 text-sm rounded-lg",
    lg: "h-12 px-6 text-[15px] rounded-xl",
  };
  const variants = {
    primary: "bg-moss text-paper hover:bg-[#24483d]",
    ghost: "border border-line bg-white/60 hover:bg-white text-ink",
    quiet: "text-muted hover:text-ink hover:bg-black/5",
    danger: "bg-signal text-white hover:bg-[#c73f1e]",
    tag: "bg-tag text-ink hover:bg-[#e8b53c]",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={cx("rounded-card border border-line bg-white/70", className)}>{children}</Tag>;
}

export function Field({
  label,
  hint,
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; inputClassName?: string }) {
  return (
    <label className={cx("block", className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink/80">{label}</span>}
      <input
        className={cx(
          "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/60 focus:border-moss focus:outline-none",
          inputClassName
        )}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "tag" }) {
  const tones = {
    neutral: "border-line text-muted",
    ok: "border-moss/30 bg-moss/10 text-moss",
    warn: "border-tag/50 bg-tag/20 text-[#8a6a12]",
    bad: "border-signal/30 bg-signal/10 text-signal",
    tag: "border-line bg-paper text-ink/70",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color = tone === "bad" ? "text-signal" : tone === "warn" ? "text-[#8a6a12]" : "text-ink";
  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={cx("numeric mt-1 text-[22px] font-medium leading-none", color)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={cx("max-h-[90vh] w-full overflow-auto rounded-t-2xl border border-line bg-paper sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-md")}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-muted hover:bg-black/5" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty }: { columns: string[]; rows: (string | number)[][]; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                {empty ?? "Sin datos todavía."}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0 hover:bg-black/[0.02]">
                {r.map((cell, j) => (
                  <td key={j} className={cx("px-3 py-2.5", j === 0 ? "font-medium" : "text-ink/80", typeof cell === "number" && "numeric")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <p className="max-w-xs text-sm text-muted">{title}</p>
      {action}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">{children}</h2>
      {right}
    </div>
  );
}
