"use client";
import { useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dateKey, makeId } from "@/lib/utils";
import type { DailyReminder } from "@/types";
import { CustomSelect } from "./CustomSelect";
import { SlideToFinish } from "./SlideToFinish";
import { Modal } from "./ui";

const recurrenceOptions = [{ value: "daily", label: "Daily" }, { value: "once", label: "One-time" }];
const isFinished = (item: DailyReminder, date: string) => item.recurrence === "once" ? item.completedDates.length > 0 : item.completedDates.includes(date);

export function DailyReminders({ manageOpen, onClose }: { manageOpen: boolean; onClose: () => void }) {
  const { data, addReminder, deleteReminder, setReminderRecurrence, completeReminder } = useApp();
  const [today, setToday] = useState(dateKey);
  const reminders = data.reminders || [];
  const [dailyOpen, setDailyOpen] = useState(() => reminders.some(item => !isFinished(item, dateKey())));
  const [label, setLabel] = useState("");
  const [recurrence, setRecurrence] = useState<"daily" | "once">("daily");
  useEffect(() => {
    const refresh = () => { const next = dateKey(); if (next !== today) { setToday(next); setDailyOpen(true); } };
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [today]);
  const due = reminders.filter(item => !isFinished(item, today));
  const close = () => { setDailyOpen(false); onClose(); };
  return <Modal open={manageOpen || (dailyOpen && due.length > 0)} onClose={close} title={manageOpen ? "Reminders" : "Your reminders"} description="Daily reminders repeat each day. One-time reminders stop after you finish them." width="max-w-sm" footer={<button type="button" className="secondary-button w-full" onClick={close}>{manageOpen ? "Done" : "Later"}</button>}>
    <div className="space-y-3">
      {(manageOpen ? reminders : due).map(item => <div key={item.id} className="reminder-card">
        <div className="flex items-center gap-3"><span className="reminder-bell"><Bell size={19}/></span><span className="min-w-0 flex-1 break-words text-base font-semibold">{item.label}</span>{manageOpen && <button className="icon-button shrink-0" aria-label={`Remove reminder ${item.label}`} onClick={() => deleteReminder(item.id)}><Trash2 size={16}/></button>}</div>
        {manageOpen ? <div className="mt-3"><span className="label">Repeat</span><CustomSelect label={`Repeat ${item.label}`} value={item.recurrence || "daily"} onChange={value => setReminderRecurrence(item.id, value as "daily" | "once")} options={recurrenceOptions}/></div> : <p className="muted mt-2 text-sm">{item.recurrence === "once" ? "One-time" : "Daily"}</p>}
        {isFinished(item, today) ? <div className="flex items-center justify-between gap-3 pt-3"><span className="muted text-sm">{item.recurrence === "once" ? "Finished" : "Finished today"}</span><button className="reminder-undo" onClick={() => completeReminder(item.id, today, false)}>Undo</button></div> : <SlideToFinish key={`${item.id}-${today}`} label={item.label} onFinish={() => completeReminder(item.id, today, true)}/>}
      </div>)}
      {manageOpen && <form className="space-y-3 pt-2" onSubmit={e => { e.preventDefault(); const value = label.trim(); if (!value) return; addReminder({ id: makeId("reminder"), label: value, recurrence, completedDates: [] }); setLabel(""); }}><label><span className="label">New reminder</span><input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="What would you like to remember?" maxLength={120} required /></label><div><span className="label">Repeat</span><CustomSelect label="Reminder repeat" value={recurrence} onChange={value => setRecurrence(value as "daily" | "once")} options={recurrenceOptions}/></div><button className="primary-button w-full" disabled={!label.trim()}><Plus size={17}/> Add reminder</button></form>}
      {manageOpen && !reminders.length && <p className="muted flex items-center gap-2 text-sm"><Bell size={16}/> No reminders yet</p>}
    </div>
  </Modal>;
}
