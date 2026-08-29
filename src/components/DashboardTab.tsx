"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDown, ArrowUp, BedDouble, Droplets, Flame, Moon, Plus, Scale, Sunrise, Utensils } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { chartData, formatCalories, getDailyTotals, makeId, safeNumber } from "@/lib/utils";
import { Modal, ProgressRing } from "./ui";
import type { WeightTiming } from "@/types";

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid rgb(var(--line))",
  background: "rgb(var(--card))",
  color: "rgb(var(--text))",
  fontSize: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
};

export function DashboardTab({ date, onAddFood, onAddActivity, onAddWater }: { date: string; onAddFood: () => void; onAddActivity: () => void; onAddWater: () => void }) {
  const { data, addWeight, notify } = useApp();
  const [range, setRange] = useState<1 | 7 | 30>(7);
  const [weightTiming, setWeightTiming] = useState<WeightTiming | null>(null);
  const totals = useMemo(() => getDailyTotals(data, date), [data, date]);
  const points = useMemo(() => chartData(data, date, range), [data, date, range]);
  const calorieProgress = data.profile.calorieGoal ? (totals.net / data.profile.calorieGoal) * 100 : 0;
  const waterProgress = data.profile.waterGoalOz ? (totals.water / data.profile.waterGoalOz) * 100 : 0;
  const dayWeight = data.weightLog.filter((entry) => entry.date === date);

  const saveWeight = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!weightTiming) return;
    const form = new FormData(event.currentTarget);
    const pounds = safeNumber(form.get("pounds"));
    if (pounds < 50 || pounds > 1000) {
      notify("Enter a weight between 50 and 1,000 lb.", "error");
      return;
    }
    addWeight({ id: makeId("weight"), date, pounds, timing: weightTiming, loggedAt: new Date().toISOString() });
    notify(`${weightTiming === "morning" ? "Morning" : "Bedtime"} weight saved.`);
    setWeightTiming(null);
  };

  return (
    <div className="dashboard-content w-full min-w-0 space-y-5 overflow-x-hidden animate-rise">
      <section className="grid w-full min-w-0 gap-4 xl:grid-cols-[1.4fr_.9fr]">
        <div className="card relative">
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
            <div className="grid shrink-0 place-items-center px-2 sm:px-5">
              <ProgressRing value={calorieProgress} size={178} stroke={14}>
                <div>
                  <span className="heading block text-3xl">{formatCalories(Math.max(totals.remaining, 0))}</span>
                  <span className="muted text-xs font-semibold">cal remaining</span>
                </div>
              </ProgressRing>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="mb-5 text-center sm:text-left">
                <p className="muted text-xs font-bold uppercase tracking-[.15em]">Daily energy</p>
                <h2 className="heading mt-1 break-words text-2xl">You’re building momentum</h2>
                <p className="muted mt-1 text-sm">Net calories count food minus active movement.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric icon={<Utensils size={16} />} label="Eaten" value={totals.eaten} color="text-orange-500" />
                <MiniMetric icon={<Flame size={16} />} label="Active" value={totals.burned} color="text-violet-500" />
                <MiniMetric icon={<Activity size={16} />} label="Net" value={totals.net} color="text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="relative mt-5 rounded-2xl bg-violet-500/7 px-4 py-3 text-xs leading-relaxed text-violet-800 dark:text-violet-200">
            <strong>How this works:</strong> {formatCalories(totals.eaten)} eaten − {formatCalories(totals.burned)} active calories = {formatCalories(totals.net)} net. Resting metabolism is intentionally not included in active calories burned.
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="flex items-start justify-between">
            <div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Hydration</p><h2 className="heading mt-1 text-xl">Water today</h2></div>
            <div className="grid size-11 place-items-center rounded-2xl bg-sky-500/10 text-sky-500"><Droplets size={22} /></div>
          </div>
          <div className="mt-6 flex items-end justify-between"><p className="heading text-4xl">{totals.water}<span className="ml-1 text-base text-sky-500">oz</span></p><span className="muted text-sm">of {data.profile.waterGoalOz} oz</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-sky-500/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all" style={{ width: `${Math.min(waterProgress, 100)}%` }} /></div>
          <p className="muted mt-2 text-xs">{Math.round(waterProgress)}% of your daily goal</p>
          <button type="button" className="secondary-button mt-auto w-full border-sky-500/20 text-sky-600 dark:text-sky-400" onClick={onAddWater}><Plus size={17} /> Add water</button>
        </div>
      </section>

      <section className="grid w-full min-w-0 grid-cols-3 gap-3">
        <MacroCard label="Protein" value={totals.protein} goal={140} color="bg-rose-400" />
        <MacroCard label="Carbs" value={totals.carbs} goal={240} color="bg-amber-400" />
        <MacroCard label="Fat" value={totals.fat} goal={70} color="bg-violet-400" />
      </section>

      <section className="card">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Your trends</p><h2 className="heading mt-1 text-xl">Energy & hydration</h2></div>
          <div className="flex rounded-xl bg-violet-500/7 p-1">
            {([[1, "Day"], [7, "Week"], [30, "Month"]] as const).map(([days, label]) => <button type="button" key={days} onClick={() => setRange(days)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${range === days ? "bg-violet-500 text-white shadow" : "muted"}`}>{label}</button>)}
          </div>
        </div>
        <div className="h-56 w-full" aria-label="Calories eaten, burned, and net chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 2, left: -22, bottom: 0 }}>
              <defs><linearGradient id="eatenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.25}/><stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="eaten" name="Calories eaten" stroke="rgb(var(--accent))" fill="url(#eatenFill)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="burned" name="Active burned" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="net" name="Net calories" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs font-semibold"><LegendDot color="bg-violet-500" text="Eaten" /><LegendDot color="bg-amber-500" text="Active burned" /><LegendDot color="bg-emerald-500" text="Net" /></div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold">Water intake (oz)</p>
            <div className="h-36"><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{ left: -26 }}><XAxis dataKey="label" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="water" name="Water (oz)" fill="#38bdf8" radius={[7,7,2,2]}/></BarChart></ResponsiveContainer></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold">Weight trend (lb)</p>
            <div className="h-36"><ResponsiveContainer width="100%" height="100%"><AreaChart data={points} margin={{ left: -12 }}><XAxis dataKey="label" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]}/><Tooltip contentStyle={tooltipStyle}/><Area connectNulls dataKey="weight" name="Weight (lb)" stroke="#ec4899" fill="#ec489922" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div>
          </div>
        </div>
      </section>

      <section className="grid w-full min-w-0 gap-4 md:grid-cols-[1.1fr_.9fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between"><div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Quick actions</p><h2 className="heading mt-1 text-xl">Log in a tap</h2></div><Plus className="text-violet-500" /></div>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction icon={<Utensils />} label="Food" className="bg-orange-500/10 text-orange-600 dark:text-orange-400" onClick={onAddFood}/>
            <QuickAction icon={<Flame />} label="Activity" className="bg-violet-500/10 text-violet-600 dark:text-violet-400" onClick={onAddActivity}/>
            <QuickAction icon={<Droplets />} label="Water" className="bg-sky-500/10 text-sky-600 dark:text-sky-400" onClick={onAddWater}/>
          </div>
        </div>
        <div className="card">
          <div className="mb-4 flex items-start justify-between"><div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Daily check-in</p><h2 className="heading mt-1 text-xl">Weight</h2></div><Scale className="text-pink-500" /></div>
          <div className="grid grid-cols-2 gap-2">
            <WeightButton icon={<Sunrise size={18}/>} title="Wake up" value={dayWeight.find((entry) => entry.timing === "morning")?.pounds} onClick={() => setWeightTiming("morning")} />
            <WeightButton icon={<BedDouble size={18}/>} title="Before bed" value={dayWeight.find((entry) => entry.timing === "bedtime")?.pounds} onClick={() => setWeightTiming("bedtime")} />
          </div>
        </div>
      </section>

      <Modal open={weightTiming !== null} onClose={() => setWeightTiming(null)} title={weightTiming === "morning" ? "Morning weight" : "Bedtime weight"} description="Use the same scale and conditions for a clearer trend." width="max-w-sm" footer={<button className="primary-button w-full" type="submit" form="weight-form"><Scale size={17}/> Save weight</button>}>
        <form id="weight-form" onSubmit={saveWeight} className="space-y-4">
          <label><span className="label">Weight in pounds</span><input className="input text-lg" name="pounds" type="number" min="50" max="1000" step="0.1" required autoFocus defaultValue={dayWeight.find((entry) => entry.timing === weightTiming)?.pounds} placeholder="182.4" /></label>
        </form>
      </Modal>
    </div>
  );
}

function MiniMetric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return <div className="subtle-card min-w-0 p-3 text-center"><span className={`mx-auto mb-1 flex justify-center ${color}`}>{icon}</span><strong className="heading block truncate text-base">{formatCalories(value)}</strong><span className="muted block truncate text-[10px] font-semibold">{label}</span></div>;
}
function MacroCard({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const percent = Math.min((value / goal) * 100, 100);
  return <div className="card !rounded-2xl !p-3 sm:!p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold">{label}</p><span className="muted hidden text-[10px] sm:block">{Math.round(percent)}%</span></div><p className="heading mt-1 text-lg sm:text-2xl">{Math.round(value)}<span className="muted ml-0.5 text-xs">g</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-500/8"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }}/></div></div>;
}
function LegendDot({ color, text }: { color: string; text: string }) { return <span className="muted flex items-center gap-1.5"><i className={`size-2 rounded-full ${color}`} />{text}</span>; }
function QuickAction({ icon, label, className, onClick }: { icon: React.ReactNode; label: string; className: string; onClick: () => void }) { return <button type="button" className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl text-sm font-bold transition hover:-translate-y-0.5 ${className}`} onClick={onClick}><span className="[&>svg]:size-5">{icon}</span>{label}</button>; }
function WeightButton({ icon, title, value, onClick }: { icon: React.ReactNode; title: string; value?: number; onClick: () => void }) { return <button type="button" className="subtle-card flex min-h-24 flex-col items-start justify-between p-3 text-left transition hover:border-violet-400" onClick={onClick}><span className="text-pink-500">{icon}</span><span><span className="block text-xs font-bold">{title}</span><span className="muted text-xs">{value ? `${value} lb` : "Add weight"}</span></span></button>; }
