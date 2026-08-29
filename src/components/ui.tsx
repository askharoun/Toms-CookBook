"use client";

import { useEffect } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X, XCircle } from "lucide-react";
import { displayDate, offsetDate } from "@/lib/utils";
import type { ToastState } from "@/types";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Tom’s CookBook">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-[15px] shadow-glow" style={{ background: "linear-gradient(145deg, rgb(var(--accent-soft)), rgb(var(--accent-deep)))", color: "#f5dca0" }}>
        <span className="absolute inset-0 grid place-items-center pt-1 text-[25px] leading-none" style={{ fontFamily: "var(--font-logo), cursive" }}>TC</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="heading whitespace-nowrap text-[15px]">Tom’s <span className="text-violet-500">CookBook</span></p>
        </div>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="popup-backdrop fixed inset-0 isolate z-[200] flex items-end justify-center before:pointer-events-none before:absolute before:-inset-20 before:bg-ink/65 before:backdrop-blur-md sm:items-center" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`popup-dialog popup-panel popup-surface relative z-10 flex w-full ${width} min-w-0 flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="shrink-0 px-5 pt-4 sm:px-6 sm:pt-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" style={{ background: "rgb(var(--line))" }} aria-hidden="true" />
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="modal-title" className="heading break-words text-xl">{title}</h2>
              {description && <p className="muted mt-1 break-words text-sm leading-relaxed">{description}</p>}
            </div>
            <button type="button" className="icon-button shrink-0 border-0 bg-violet-500/7" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
          </div>
        </div>
        {children && <div className="popup-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5 sm:px-6">{children}</div>}
        {footer && <div className="popup-footer shrink-0 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className="popup-toast popup-surface fixed left-1/2 top-4 z-[150] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold sm:w-auto" role="status">
      {toast.tone === "success" ? <CheckCircle2 className="text-emerald-500" size={18} /> : <XCircle className="text-rose-500" size={18} />}
      {toast.message}
    </div>
  );
}

export function DateNavigator({ date, setDate }: { date: string; setDate: (date: string) => void }) {
  const today = offsetDate(date, 0) === offsetDate(new Date().toISOString().slice(0, 10), 0);
  return (
    <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--card))" }}>
      <button type="button" className="grid size-9 place-items-center rounded-lg hover:bg-violet-500/5" onClick={() => setDate(offsetDate(date, -1))} aria-label="Previous day"><ChevronLeft size={17} /></button>
      <label className="relative min-w-24 cursor-pointer text-center sm:min-w-32">
        <span className="block text-xs font-bold">{today ? "Today" : displayDate(date)}</span>
        <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => event.target.value && setDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose date" />
      </label>
      <button type="button" className="grid size-9 place-items-center rounded-lg hover:bg-violet-500/5 disabled:opacity-30" onClick={() => setDate(offsetDate(date, 1))} disabled={today} aria-label="Next day"><ChevronRight size={17} /></button>
    </div>
  );
}

export function ProgressRing({ value, size = 150, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  const progress = Math.min(Math.max(value, 0), 100);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#ring-gradient)" strokeLinecap="round" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference} />
        <defs><linearGradient id="ring-gradient"><stop stopColor="rgb(var(--accent-soft))" /><stop offset="1" stopColor="rgb(var(--accent-deep))" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="subtle-card flex flex-col items-center px-5 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-500">{icon}</div>
      <h3 className="heading text-base">{title}</h3>
      <p className="muted mt-1 max-w-xs text-sm">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, title, description, onClose, onConfirm, confirmLabel = "Delete", tone = "danger" }: { open: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void; confirmLabel?: string; tone?: "danger" | "primary" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} width="max-w-sm" footer={
      <div className="flex gap-3">
        <button type="button" className="secondary-button flex-1" onClick={onClose}>Cancel</button>
        <button type="button" className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-bold text-white transition ${tone === "primary" ? "bg-violet-500 hover:brightness-95" : "bg-rose-600 hover:bg-rose-700"}`} style={tone === "primary" ? { backgroundColor: "rgb(var(--accent))" } : undefined} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    } />
  );
}

export function Skeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse p-5 lg:p-8">
      <div className="mb-8 h-12 w-48 rounded-2xl bg-violet-500/10" />
      <div className="grid gap-4 lg:grid-cols-3"><div className="h-72 rounded-3xl bg-violet-500/10 lg:col-span-2" /><div className="h-72 rounded-3xl bg-violet-500/10" /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="h-32 rounded-3xl bg-violet-500/10" /><div className="h-32 rounded-3xl bg-violet-500/10" /><div className="h-32 rounded-3xl bg-violet-500/10" /></div>
    </div>
  );
}
