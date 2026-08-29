"use client";

import { useState } from "react";
import { Bike, Check, Dumbbell, Flame, Footprints, Plus, Route, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatCalories, getDailyTotals, makeId, safeNumber } from "@/lib/utils";
import type { ActivityEntry, SavedWorkout } from "@/types";
import { ConfirmDialog, EmptyState, Modal } from "./ui";

export function ActivityTab({ date, requestedAction, onActionHandled }: { date: string; requestedAction: boolean; onActionHandled: () => void }) {
  const { data, addActivity, deleteActivity, addSavedWorkout, deleteSavedWorkout, notify } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "entry" | "workout"; id: string; name: string } | null>(null);
  const totals = getDailyTotals(data, date);
  const entries = data.activityLog.filter((entry) => entry.date === date);

  const logWorkout = (workout: SavedWorkout) => {
    addActivity({ id: makeId("activity"), date, name: workout.name, activeCalories: workout.activeCalories, workoutCalories: workout.activeCalories, durationMinutes: workout.durationMinutes, source: "saved_workout", loggedAt: new Date().toISOString() });
    notify(`${workout.name} added to activity.`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "entry") deleteActivity(deleteTarget.id); else deleteSavedWorkout(deleteTarget.id);
    notify(`${deleteTarget.name} deleted.`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 animate-rise">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActivityStat icon={<Flame/>} label="Active calories" value={formatCalories(totals.burned)} unit="cal" color="bg-violet-500/10 text-violet-500" />
        <ActivityStat icon={<Dumbbell/>} label="Workout calories" value={formatCalories(totals.workoutCalories)} unit="cal" color="bg-orange-500/10 text-orange-500" />
        <ActivityStat icon={<Footprints/>} label="Steps" value={totals.steps.toLocaleString()} color="bg-emerald-500/10 text-emerald-500" />
        <ActivityStat icon={<Route/>} label="Distance" value={totals.distanceMiles.toFixed(1)} unit="mi" color="bg-sky-500/10 text-sky-500" />
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Repeatable routines</p><h2 className="heading mt-1 text-xl">Saved workouts</h2></div><button type="button" className="primary-button" onClick={() => setAddOpen(true)}><Plus size={17}/> Add activity</button></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(showAllWorkouts ? data.savedWorkouts : data.savedWorkouts.slice(0, 3)).map((workout) => (
          <article key={workout.id} className="subtle-card min-w-0 p-4">
            <div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500">{workout.icon === "cycle" ? <Bike size={19}/> : workout.icon === "walk" || workout.icon === "run" ? <Footprints size={19}/> : <Dumbbell size={19}/>}</div><button type="button" className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-500/10" onClick={() => setDeleteTarget({ kind: "workout", id: workout.id, name: workout.name })} aria-label={`Delete saved workout ${workout.name}`}><Trash2 size={14}/></button></div>
            <h3 className="heading mt-3 truncate text-sm">{workout.name}</h3><p className="muted mt-0.5 text-xs">{workout.activeCalories} cal{workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}</p>
            <button type="button" className="secondary-button mt-3 w-full !min-h-9 !py-1.5" onClick={() => logWorkout(workout)}><Plus size={15}/> Log</button>
          </article>
        ))}</div>
        {data.savedWorkouts.length > 3 && <button type="button" className="secondary-button mt-4 w-full" onClick={() => setShowAllWorkouts((value) => !value)}>{showAllWorkouts ? "Show fewer workouts" : `Show all ${data.savedWorkouts.length} workouts`}</button>}
      </section>

      <section className="card">
        <div className="mb-4"><p className="muted text-xs font-bold uppercase tracking-[.15em]">Activity diary</p><h2 className="heading mt-1 text-xl">Recorded today</h2></div>
        {entries.length ? <><div className="space-y-2">{(showAllEntries ? entries : entries.slice(0, 5)).map((entry) => <ActivityRow key={entry.id} entry={entry} onDelete={() => setDeleteTarget({ kind: "entry", id: entry.id, name: entry.name })}/>)}</div>{entries.length > 5 && <button type="button" className="secondary-button mt-4 w-full" onClick={() => setShowAllEntries((value) => !value)}>{showAllEntries ? "Show fewer entries" : `Show all ${entries.length} entries`}</button>}</> : <EmptyState icon={<Flame/>} title="No movement recorded" text="Enter active calories manually or log a saved workout." action={<button type="button" className="primary-button" onClick={() => setAddOpen(true)}><Plus size={17}/> Add activity</button>}/>} 
      </section>

      <AddActivityModal open={addOpen || requestedAction} date={date} onClose={() => { setAddOpen(false); onActionHandled(); }} onSave={(entry, savedWorkout) => {
        addActivity(entry);
        if (savedWorkout) addSavedWorkout(savedWorkout);
        notify("Activity added. Your net calories are updated.");
        setAddOpen(false);
        onActionHandled();
      }}/>
      <ConfirmDialog open={deleteTarget !== null} title={`Delete ${deleteTarget?.name || "activity"}?`} description={deleteTarget?.kind === "workout" ? "This removes the reusable workout. Activity already logged from it will remain." : "This removes the activity and updates calories burned and net calories."} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>
    </div>
  );
}

function ActivityStat({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string; unit?: string; color: string }) { return <div className="card !rounded-2xl !p-4"><div className={`mb-3 grid size-10 place-items-center rounded-xl [&>svg]:size-[18px] ${color}`}>{icon}</div><p className="heading text-2xl">{value}<span className="muted ml-1 text-xs">{unit}</span></p><p className="muted mt-1 truncate text-xs font-semibold">{label}</p></div>; }
function ActivityRow({ entry, onDelete }: { entry: ActivityEntry; onDelete: () => void }) { return <div className="subtle-card flex items-center gap-3 p-3.5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Flame size={19}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.name}</p><p className="muted truncate text-xs">{entry.source === "saved_workout" ? "Saved workout" : "Manual entry"}{entry.durationMinutes ? ` · ${entry.durationMinutes} min` : ""}</p></div><div className="text-right"><p className="heading text-sm">{entry.activeCalories} cal</p>{entry.steps ? <p className="muted text-[10px]">{entry.steps.toLocaleString()} steps</p> : null}</div><button type="button" className="icon-button !size-9 text-rose-500" onClick={onDelete} aria-label={`Delete ${entry.name}`}><Trash2 size={15}/></button></div>; }

function AddActivityModal({ open, date, onClose, onSave }: { open: boolean; date: string; onClose: () => void; onSave: (entry: ActivityEntry, saved?: SavedWorkout) => void }) {
  const { notify } = useApp();
  const [saveRoutine, setSaveRoutine] = useState(false);
  const close = () => { setSaveRoutine(false); onClose(); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const activeCalories = safeNumber(form.get("activeCalories"));
    const workoutCalories = safeNumber(form.get("workoutCalories"));
    if (!name || activeCalories <= 0) { notify("Add a name and active calories greater than zero.", "error"); return; }
    const entry: ActivityEntry = { id: makeId("activity"), date, name, activeCalories, workoutCalories: Math.min(workoutCalories, activeCalories), steps: optionalPositive(form.get("steps")), distanceMiles: optionalPositive(form.get("distanceMiles")), durationMinutes: optionalPositive(form.get("duration")), source: "manual", loggedAt: new Date().toISOString() };
    const saved = saveRoutine ? { id: makeId("workout"), name, activeCalories, durationMinutes: entry.durationMinutes, icon: "strength" as const } : undefined;
    setSaveRoutine(false);
    onSave(entry, saved);
  };
  return <Modal open={open} onClose={close} title="Add activity" description="Record active movement. Resting energy is not part of this entry."><form onSubmit={submit} className="space-y-4">
    <label><span className="label">Activity name *</span><input className="input" name="name" required autoFocus placeholder="Daily movement"/></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">Active calories *</span><input className="input" name="activeCalories" type="number" min="1" step="1" required placeholder="420"/></label><label><span className="label">Workout calories</span><input className="input" name="workoutCalories" type="number" min="0" step="1" placeholder="210"/></label><label><span className="label">Steps</span><input className="input" name="steps" type="number" min="0" step="1" placeholder="8240"/></label><label><span className="label">Distance (miles)</span><input className="input" name="distanceMiles" type="number" min="0" step="0.01" placeholder="3.7"/></label><label><span className="label">Duration (minutes)</span><input className="input" name="duration" type="number" min="0" step="1" placeholder="35"/></label></div>
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "rgb(var(--line))" }}><input type="checkbox" checked={saveRoutine} onChange={(event) => setSaveRoutine(event.target.checked)} className="rounded border-violet-300 text-violet-500 focus:ring-violet-500"/><span><span className="block text-sm font-bold">Save as reusable workout</span><span className="muted block text-xs">Log these calories again in one tap.</span></span></label>
    <button type="submit" className="primary-button w-full"><Check size={17}/> Add activity</button>
  </form></Modal>;
}
function optionalPositive(value: FormDataEntryValue | null) { const number = safeNumber(value); return number > 0 ? number : undefined; }
