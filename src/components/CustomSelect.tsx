"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function CustomSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>(`[data-option="${active}"]`)?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [open, active]);
  const choose = (index: number) => { if (!options[index]) return; onChange(options[index].value); setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  return <div ref={root} className="custom-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} className="input select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={open ? `${listId}-${active}` : undefined} onClick={() => { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(current => !current); }} onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setOpen(true); setActive(index => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
      else if (open && ["Enter", " "].includes(event.key)) { event.preventDefault(); choose(active); }
      else if (event.key.length === 1 && event.key !== " ") { const index = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (index >= 0) { setActive(index); setOpen(true); } }
    }}><span>{selected?.label || "Choose"}</span><ChevronDown size={18} className={open ? "rotate-180" : ""}/></button>
    {open && <div id={listId} className="select-options" role="listbox" aria-label={label}>{options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} data-option={index} role="option" aria-selected={value === option.value} className={`select-option ${index === active ? "is-active" : ""}`} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{option.value === value && <Check size={17}/>}</div>)}</div>}
  </div>;
}
