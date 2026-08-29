"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Check, CupSoda, Droplet, Droplets, GlassWater, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { chartData, displayDate, getDailyTotals, makeId, offsetDate, safeNumber } from "@/lib/utils";
import { ConfirmDialog, EmptyState, Modal, ProgressRing } from "./ui";

const QUICK_AMOUNTS = [
  { amount: 8, label: "Glass", icon: GlassWater },
  { amount: 12, label: "Cup", icon: GlassWater },
  { amount: 16, label: "Tumbler", icon: Droplets },
  { amount: 16.9, label: "Bottle", icon: CupSoda },
  { amount: 24, label: "Large", icon: CupSoda },
];

export function WaterTab({ date, requestedAction, onActionHandled }: { date: string; requestedAction: boolean; onActionHandled: () => void }) {
  const { data, addWater, deleteWater, undoWater, notify } = useApp();
  const [customOpen, setCustomOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const totals = getDailyTotals(data, date);
  const entries = data.waterLog.filter((entry) => entry.date === date).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const progress = data.profile.waterGoalOz ? Math.round((totals.water / data.profile.waterGoalOz) * 100) : 0;
  const week = useMemo(() => chartData(data, date, 7), [data, date]);

  const addAmount = (amountOz: number) => {
    addWater({ id: makeId("water"), date, amountOz, loggedAt: new Date().toISOString() });
    notify(`${amountOz} oz of water added.`);
  };
  const handleUndo = () => {
    if (undoWater(date)) notify("Latest water entry undone."); else notify("There’s no water entry to undo.", "error");
  };

  return (
    <div className="space-y-5 animate-rise">
      <section className="grid gap-4 lg:grid-cols-[.9fr_1.3fr]">
        <div className="card flex flex-col items-center text-center">
          <p className="muted text-xs font-bold uppercase tracking-[.15em]">Hydration goal</p>
          <div className="my-5"><ProgressRing value={progress} size={190} stroke={15}><div><Droplet className="mx-auto mb-1 fill-sky-400 text-sky-500" size={20}/><p className="heading text-3xl">{progress}%</p><p className="muted text-xs">{totals.water} / {data.profile.waterGoalOz} oz</p></div></ProgressRing></div>
          <p className="muted max-w-xs text-sm">{progress >= 100 ? "Goal reached—nice work staying hydrated." : `${Math.max(data.profile.waterGoalOz - totals.water, 0).toFixed(1)} oz left to reach today’s goal.`}</p>
        </div>
        <div className="card">
          <div className="mb-5 flex items-start justify-between gap-3"><div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Quick add</p><h2 className="heading mt-1 text-xl">What did you drink?</h2></div><button type="button" className="secondary-button" onClick={handleUndo} disabled={!entries.length}><RotateCcw size={16}/> <span className="hidden sm:inline">Undo latest</span></button></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{QUICK_AMOUNTS.map(({ amount, label, icon: Icon }) => <button type="button" key={amount} className="subtle-card flex min-h-28 flex-col items-center justify-center gap-1 transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-500/5" onClick={() => addAmount(amount)}><Icon className="mb-1 text-sky-500" size={21}/><strong className="heading text-xl">{amount}<span className="ml-0.5 text-xs">oz</span></strong><span className="muted text-[10px] font-bold uppercase tracking-wider">{label}</span></button>)}
            <button type="button" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5" onClick={() => setCustomOpen(true)}><Plus size={21}/> Custom amount</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-5"><p className="muted text-xs font-bold uppercase tracking-[.15em]">Last 7 days</p><h2 className="heading mt-1 text-xl">Water history</h2></div>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={week}><XAxis dataKey="label" axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: "rgb(var(--accent) / .05)" }} contentStyle={{ borderRadius: 14, border: "1px solid rgb(var(--line))", background: "rgb(var(--card))", color: "rgb(var(--text))", fontSize: 12 }}/><Bar dataKey="water" name="Water (oz)" radius={[8,8,3,3]}>{week.map((point) => <Cell key={point.date} fill={point.date === date ? "rgb(var(--accent))" : "#38bdf8"} opacity={point.date === date ? 1 : .55}/>)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="mt-2 flex items-center justify-between"><span className="muted text-xs">Goal: {data.profile.waterGoalOz} oz/day</span><span className="text-xs font-bold text-violet-500">{displayDate(offsetDate(date, -6))} – {displayDate(date)}</span></div>
        </div>
        <div className="card">
          <div className="mb-4"><p className="muted text-xs font-bold uppercase tracking-[.15em]">Daily entries</p><h2 className="heading mt-1 text-xl">{displayDate(date)}</h2></div>
          {entries.length ? <><div className="space-y-2">{(showAllEntries ? entries : entries.slice(0, 4)).map((entry) => <div key={entry.id} className="subtle-card flex items-center gap-3 p-3"><div className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-500"><Droplet size={16}/></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{entry.amountOz} oz</p><p className="muted text-[10px]">{new Date(entry.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div><button type="button" className="icon-button !size-8 text-rose-500" onClick={() => setDeleteTarget(entry.id)} aria-label={`Delete ${entry.amountOz} ounce water entry`}><Trash2 size={14}/></button></div>)}</div>{entries.length > 4 && <button type="button" className="secondary-button mt-4 w-full" onClick={() => setShowAllEntries((value) => !value)}>{showAllEntries ? "Show fewer entries" : `Show all ${entries.length} entries`}</button>}</> : <EmptyState icon={<Droplets/>} title="No water logged" text="Use a quick button to add your first drink for this day."/>}
        </div>
      </section>

      <Modal open={customOpen || requestedAction} onClose={() => { setCustomOpen(false); onActionHandled(); }} title="Add water" description="Choose a common size or enter an exact amount." width="max-w-sm">
        <div className="mb-4 grid grid-cols-5 gap-2">{QUICK_AMOUNTS.map(({ amount }) => <button type="button" key={amount} className="subtle-card min-h-12 text-xs font-bold hover:border-sky-400" onClick={() => { addAmount(amount); setCustomOpen(false); onActionHandled(); }}>{amount}<span className="block text-[9px] font-normal">oz</span></button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); const amount = safeNumber(new FormData(event.currentTarget).get("amount")); if (amount <= 0 || amount > 500) { notify("Enter an amount between 0.1 and 500 oz.", "error"); return; } addAmount(amount); setCustomOpen(false); onActionHandled(); }} className="space-y-4"><label><span className="label">Custom ounces</span><input className="input text-lg" name="amount" type="number" min="0.1" max="500" step="0.1" required autoFocus placeholder="20"/></label><button type="submit" className="primary-button w-full"><Check size={17}/> Add water</button></form>
      </Modal>
      <ConfirmDialog open={deleteTarget !== null} title="Delete this water entry?" description="Your hydration total and progress will update immediately." onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) { deleteWater(deleteTarget); notify("Water entry deleted."); } setDeleteTarget(null); }}/>
    </div>
  );
}
