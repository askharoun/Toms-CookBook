"use client";

import { createPortal } from "react-dom";
import { useNotificationPresence } from "./useNotificationPresence";
import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X, XCircle } from "lucide-react";
import { dateKey, displayDate, offsetDate } from "@/lib/utils";
import type { ToastState } from "@/types";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Tom’s CookBook">
      <span className="brand-logo" role="img" aria-label="Tom CookBook fire logo"><span /></span>
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
  descriptionIsHelp = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  descriptionIsHelp?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) closeRef.current();
      if (event.key !== "Tab") return;
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const timer = setTimeout(() => { if (!panel.current?.contains(document.activeElement)) focusable()[0]?.focus(); }, 0);
    document.addEventListener("keydown", onKey);
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    let scrollTimer: ReturnType<typeof setTimeout>;
    const updateViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      if (backdrop.current) {
        backdrop.current.style.height = `${height}px`;
        backdrop.current.style.top = `${viewport?.offsetTop ?? 0}px`;
        backdrop.current.style.bottom = "auto";
      }
      const focused = document.activeElement;
      const editing = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement;

      clearTimeout(scrollTimer);
      if (editing && panel.current?.contains(focused)) scrollTimer = setTimeout(() => {
        focused.scrollIntoView({ block: "nearest", behavior: "auto" });
      }, 100);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    document.addEventListener("focusin", updateViewport);
    document.addEventListener("focusout", updateViewport);
    return () => {
      clearTimeout(timer);
      previous?.focus();
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = priorOverflow;
      clearTimeout(scrollTimer);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      document.removeEventListener("focusin", updateViewport);
      document.removeEventListener("focusout", updateViewport);
    };
  }, [open]);
  if (!open) return null;
  return (
    <div ref={backdrop} className="popup-backdrop fixed inset-0 isolate z-[200] flex items-center justify-center before:pointer-events-none before:absolute before:-inset-20 before:bg-ink/65 before:backdrop-blur-md sm:items-center" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`popup-dialog popup-panel popup-surface relative z-10 flex w-full ${width} min-w-0 flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]`} ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="shrink-0 px-5 pt-4 sm:px-6 sm:pt-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="heading break-words text-xl">{title}</h2>
              {description && <p className={`${descriptionIsHelp ? "help-copy " : ""}muted mt-1 break-words text-sm leading-relaxed`}>{description}</p>}
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
  const { item, exiting } = useNotificationPresence(toast);
  if (!item) return null;
  return (
    <div className={`simple-toast notification-motion ${exiting ? "is-exiting" : ""}`} role="status">
      {item.tone === "success" ? <CheckCircle2 className="text-emerald-500" size={18} /> : <XCircle className="text-rose-500" size={18} />}
      {item.message}
    </div>
  );
}

export function DateNavigator({ date, setDate }: { date: string; setDate: (date: string) => void }) {
  const todayKey = dateKey();
  const today = date === todayKey;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const monthStart = new Date(`${month}-01T12:00:00`);
  const days = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const shiftMonth = (offset: number) => setMonth(dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1, 12)).slice(0, 7));
  const selectDate = (value: string) => { setDate(value); setCalendarOpen(false); };
  return <>
    <div className="date-navigator">
      <button type="button" onClick={() => setDate(offsetDate(date, -1))} aria-label="Previous day"><ChevronLeft size={17}/></button>
      <button type="button" className="date-label" aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={() => { setMonth(date.slice(0, 7)); setCalendarOpen(true); }}>{today ? "Today" : displayDate(date)}</button>
      <button type="button" onClick={() => setDate(offsetDate(date, 1))} disabled={date >= todayKey} aria-label="Next day"><ChevronRight size={17}/></button>
    </div>
    {calendarOpen && createPortal(<Modal open={calendarOpen} onClose={() => setCalendarOpen(false)} title="Choose date" width="max-w-sm" footer={<button type="button" className="secondary-button w-full" onClick={() => selectDate(todayKey)}>Today</button>}>
      <div className="calendar-heading"><button className="icon-button" type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18}/></button><strong aria-live="polite">{monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button className="icon-button" type="button" disabled={month >= todayKey.slice(0, 7)} onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18}/></button></div>
      <div className="calendar-grid">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className="calendar-weekday" key={index} aria-hidden="true">{day}</span>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <span key={`blank-${index}`}/>)}{Array.from({ length: days }, (_, index) => {
        const value = `${month}-${String(index + 1).padStart(2, "0")}`;
        return <button type="button" key={value} className={`calendar-day ${value === date ? "selected" : ""}`} disabled={value > todayKey} aria-label={displayDate(value, true)} aria-pressed={value === date} aria-current={value === todayKey ? "date" : undefined} onClick={() => selectDate(value)}>{index + 1}</button>;
      })}</div>
    </Modal>, document.body)}
  </>;
}

export function ProgressRing({ value, size = 150, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  const [progress, setProgress] = useState(0);
  const gradientId = useId();
  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(Math.min(Math.max(value, 0), 100)));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeWidth={stroke} strokeDasharray={circumference} className="progress-arc" strokeDashoffset={circumference - (progress / 100) * circumference} />
        <defs><linearGradient id={gradientId}><stop stopColor="rgb(var(--accent-soft))" /><stop offset="1" stopColor="rgb(var(--accent-deep))" /></linearGradient></defs>
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
      <p className="help-copy muted mt-1 max-w-xs text-sm">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, title, description, onClose, onConfirm, confirmLabel = "Delete", tone = "danger" }: { open: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void; confirmLabel?: string; tone?: "danger" | "primary" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} descriptionIsHelp={false} description={description} width="max-w-sm" footer={
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
