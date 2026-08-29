"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ChevronRight, Download, Droplets, Flame, LayoutDashboard, Moon, Palette, Plus, Settings, Smartphone, Sparkles, Sun, Target, Upload, Utensils, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { shareOrDownloadFile } from "@/lib/fileExport";
import { dateKey, parseStoredData, safeNumber } from "@/lib/utils";
import type { AppData, Colorway } from "@/types";
import { ActivityTab } from "./ActivityTab";
import { DashboardTab } from "./DashboardTab";
import { FoodTab } from "./FoodTab";
import { WaterTab } from "./WaterTab";
import { ConfirmDialog, DateNavigator, Logo, Modal, Skeleton, Toast } from "./ui";

type Tab = "dashboard" | "food" | "activity" | "water";
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

const NAV_ITEMS = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "food" as const, label: "Food + Calendar", mobileLabel: "Food", icon: Utensils },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "water" as const, label: "Water", icon: Droplets },
];

export function AppShell() {
  const { data, hydrated, toast, setTheme, setColorway, replaceData, updateGoals, notify } = useApp();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [foodAction, setFoodAction] = useState(false);
  const [activityAction, setActivityAction] = useState(false);
  const [waterAction, setWaterAction] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  const navigateToTab = (target: Tab) => {
    if (target === "food") setFoodAction(false);
    setTab(target);
    setQuickOpen(false);
    setSettingsMenuOpen(false);
    scrollToTop();
  };

  const goToAction = (target: "food" | "activity" | "water") => {
    setTab(target);
    setQuickOpen(false);
    setSettingsMenuOpen(false);
    scrollToTop();
    if (target === "food") setFoodAction(true);
    if (target === "activity") setActivityAction(true);
    if (target === "water") setWaterAction(true);
  };

  const exportBackup = async () => {
    const payload = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
    const file = new File([payload], `toms-cookbook-backup-${dateKey()}.json`, { type: "application/json" });
    try {
      const result = await shareOrDownloadFile(file, { title: "Tom’s CookBook backup", text: "Complete Tom’s CookBook data backup" });
      if (result !== "cancelled") notify(result === "shared" ? "Complete JSON backup shared." : "Complete JSON backup downloaded.");
    } catch {
      notify("Couldn’t export the backup.", "error");
    }
  };

  const readBackup = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parseStoredData(await file.text());
      if (!imported) throw new Error("Invalid backup");
      setPendingImport(imported);
      setSettingsMenuOpen(false);
    } catch {
      notify("That file is not a valid Tom’s CookBook backup.", "error");
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  };

  const requestInstall = async () => {
    if (!installPrompt) { setInstallOpen(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") notify("Tom’s CookBook installed.");
    setInstallPrompt(null);
  };

  if (!hydrated) return <Skeleton />;

  const titles: Record<Tab, { eyebrow: string; title: string; description: string }> = {
    dashboard: { eyebrow: "Daily overview", title: `Good ${getGreeting()}, ${data.profile.displayName}`, description: "Your food, movement, hydration, and progress in one place." },
    food: { eyebrow: "Food + calendar", title: "Food diary", description: "Build your library once, then log servings on any day." },
    activity: { eyebrow: "Movement", title: "Activity", description: "Track active energy, workouts, steps, and distance." },
    water: { eyebrow: "Hydration", title: "Water", description: "Small sips add up. Keep your daily streak moving." },
  };
  const heading = titles[tab];

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col px-4 py-6 lg:flex" style={{ background: "rgb(var(--surface) / .72)", backdropFilter: "blur(18px)" }}>
        <div className="px-2"><Logo /></div>
        <nav className="mt-9 space-y-1" aria-label="Main navigation">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${tab === id ? "bg-violet-500 text-white shadow-glow" : "muted hover:bg-violet-500/7 hover:text-violet-500"}`} onClick={() => navigateToTab(id)}><Icon size={19}/>{label}</button>)}</nav>
        <div className="mt-6 border-t pt-6" style={{ borderColor: "rgb(var(--line))" }}>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold muted hover:bg-violet-500/7 hover:text-violet-500" onClick={() => setSettingsOpen(true)}><Settings size={19}/>Goals & settings</button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold muted hover:bg-violet-500/7 hover:text-violet-500" onClick={requestInstall}><Download size={19}/>Install app</button>
        </div>
        <div className="mt-auto rounded-2xl bg-violet-500/8 p-4"><div className="mb-2 flex items-center gap-2 text-violet-500"><Smartphone size={16}/><span className="text-xs font-extrabold uppercase tracking-wider">Private by design</span></div><p className="muted text-[11px] leading-relaxed">Your personal data stays in this browser’s local storage on this device.</p></div>
      </aside>

      <main className="min-w-0 pb-28 lg:col-start-2 lg:pb-8">
        <header className="app-header sticky top-0 z-30 border-b px-4 py-3 lg:static lg:border-0 lg:px-8 lg:pb-4 lg:pt-7">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3">
            <div className="lg:hidden"><Logo compact /></div>
            <div className="hidden min-w-0 lg:block"><p className="muted text-[10px] font-extrabold uppercase tracking-[.18em]">{heading.eyebrow}</p><h1 className="heading mt-0.5 truncate text-3xl">{heading.title}</h1><p className="muted mt-1 text-sm">{heading.description}</p></div>
            <DateNavigator date={selectedDate} setDate={setSelectedDate}/>
            <div className="flex items-center gap-2">
              <button type="button" className="icon-button hidden sm:inline-flex" onClick={() => setTheme(data.profile.theme === "light" ? "dark" : "light")} aria-label={`Switch to ${data.profile.theme === "light" ? "dark" : "light"} mode`}>{data.profile.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button>
              <button type="button" className={`icon-button ${settingsMenuOpen ? "border-violet-500 bg-violet-500/10 text-violet-500" : ""}`} onClick={() => setSettingsMenuOpen((value) => !value)} aria-label="Open settings menu" aria-expanded={settingsMenuOpen}><Settings size={18}/></button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1380px] px-4 pt-5 lg:px-8 lg:pt-0">
          <div className="mb-5 lg:hidden"><p className="muted text-[10px] font-extrabold uppercase tracking-[.18em]">{heading.eyebrow}</p><h1 className="heading mt-0.5 text-2xl">{heading.title}</h1><p className="muted mt-1 text-xs">{heading.description}</p></div>
          <div className="mb-5 hidden items-center justify-end gap-2 xl:flex"><button type="button" className="secondary-button" onClick={() => goToAction("food")}><Utensils size={16}/> Add food</button><button type="button" className="secondary-button" onClick={() => goToAction("activity")}><Flame size={16}/> Add activity</button><button type="button" className="primary-button" onClick={() => goToAction("water")}><Droplets size={16}/> Add water</button></div>
          {tab === "dashboard" && <DashboardTab date={selectedDate} onAddFood={() => goToAction("food")} onAddActivity={() => goToAction("activity")} onAddWater={() => goToAction("water")}/>} 
          {tab === "food" && <FoodTab key={`food-${foodAction ? "quick" : "nav"}`} date={selectedDate} startInLibrary={foodAction}/>} 
          {tab === "activity" && <ActivityTab date={selectedDate} requestedAction={activityAction} onActionHandled={() => setActivityAction(false)}/>} 
          {tab === "water" && <WaterTab date={selectedDate} requestedAction={waterAction} onActionHandled={() => setWaterAction(false)}/>} 
        </div>
      </main>

      {settingsMenuOpen && <><button type="button" className="fixed inset-0 z-[70] cursor-default bg-transparent" onClick={() => setSettingsMenuOpen(false)} aria-label="Close settings menu"/><SettingsDropdown data={data} onTheme={setTheme} onColorway={setColorway} onGoals={() => { setSettingsMenuOpen(false); setSettingsOpen(true); }} onExport={exportBackup} onImport={() => backupInputRef.current?.click()} onInstall={() => { setSettingsMenuOpen(false); requestInstall(); }}/></>}
      <input ref={backupInputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => readBackup(event.target.files?.[0])}/>

      {quickOpen && <><button type="button" className="quick-add-backdrop fixed inset-0 z-[60] cursor-default bg-ink/15 lg:hidden" onClick={() => setQuickOpen(false)} aria-label="Close quick add menu"/><div className="quick-add-menu popup-surface fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-[65] mx-auto max-h-[60dvh] max-w-sm overflow-y-auto overflow-x-hidden rounded-[1.75rem] p-3 lg:hidden"><div className="mb-2 flex items-start justify-between gap-3 px-2 pt-1"><div className="min-w-0"><p className="muted text-[10px] font-extrabold uppercase tracking-[.16em]">Quick add</p><p className="heading break-words text-lg">What would you like to log?</p></div><button type="button" className="icon-button !size-9 shrink-0 border-0 bg-violet-500/7" onClick={() => setQuickOpen(false)} aria-label="Close quick add menu"><X size={17}/></button></div><QuickAddItem icon={<Utensils/>} title="Food" description="Choose a saved food" tone="bg-orange-500/10 text-orange-500" onClick={() => goToAction("food")}/><QuickAddItem icon={<Flame/>} title="Activity" description="Record calories or a workout" tone="bg-violet-500/10 text-violet-500" onClick={() => goToAction("activity")}/><QuickAddItem icon={<Droplets/>} title="Water" description="Use a quick size or custom amount" tone="bg-sky-500/10 text-sky-500" onClick={() => goToAction("water")}/></div></>}
      {!quickOpen && <button type="button" className="quick-add-trigger group fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] right-4 z-[65] flex h-[3.25rem] min-w-[9.25rem] items-center gap-2 rounded-[1.35rem] px-1.5 pr-3 text-sm font-extrabold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[.97] lg:hidden" onClick={() => setQuickOpen(true)} aria-label="Open quick add menu" aria-expanded="false">
        <span className="quick-add-icon relative z-10 grid size-10 shrink-0 place-items-center rounded-[1rem] text-white shadow-sm" style={{ background: "radial-gradient(circle at 82% 12%, rgb(255 255 255 / .28), transparent 36%), linear-gradient(145deg, rgb(var(--accent-soft)), rgb(var(--accent-deep)))" }}><Plus className="transition-transform duration-300 group-hover:rotate-90" size={19}/></span>
        <span className="relative z-10 whitespace-nowrap">Quick add</span>
        <Sparkles className="quick-add-sparkle relative z-10 ml-auto shrink-0 text-violet-500" size={15} strokeWidth={2.4}/>
      </button>}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t px-2 pt-2 lg:hidden" style={{ background: "rgb(var(--card) / .96)", borderColor: "rgb(var(--line))", backdropFilter: "blur(18px)" }} aria-label="Mobile navigation">{NAV_ITEMS.map(({ id, label, mobileLabel, icon: Icon }) => <button type="button" key={id} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${tab === id ? "text-violet-500" : "muted"}`} onClick={() => navigateToTab(id)}><Icon size={20} strokeWidth={tab === id ? 2.6 : 2}/><span>{mobileLabel || label}</span></button>)}</nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} calorieGoal={data.profile.calorieGoal} waterGoal={data.profile.waterGoalOz} onSave={(calorieGoal, waterGoal) => { updateGoals(calorieGoal, waterGoal); notify("Daily goals updated."); setSettingsOpen(false); }}/>
      <ConfirmDialog open={pendingImport !== null} title="Import this complete backup?" description="This replaces all food, activity, water, weight, goals, and settings currently stored on this device." confirmLabel="Import and replace" tone="primary" onClose={() => setPendingImport(null)} onConfirm={() => { if (pendingImport) { replaceData(pendingImport); notify("Backup imported. All data is now available on this device."); } setPendingImport(null); scrollToTop(); }}/>
      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Install Tom’s CookBook" description="Keep it one tap away and use your previously loaded tracker offline." width="max-w-sm" footer={<button type="button" className="primary-button w-full" onClick={() => setInstallOpen(false)}>Got it</button>}><div className="space-y-3 text-sm"><InstallStep number="1" text="On iPhone, tap the Share button in Safari."/><InstallStep number="2" text="Choose “Add to Home Screen.”"/><InstallStep number="3" text="Tap Add to install the app icon."/><div className="mt-4 rounded-2xl bg-violet-500/8 p-3 text-xs muted">On desktop, use the install icon in the browser address bar if this browser does not show an automatic prompt.</div></div></Modal>
      <Toast toast={toast}/>
    </div>
  );
}

function SettingsDropdown({ data, onTheme, onColorway, onGoals, onExport, onImport, onInstall }: { data: AppData; onTheme: (theme: AppData["profile"]["theme"]) => void; onColorway: (colorway: Colorway) => void; onGoals: () => void; onExport: () => void; onImport: () => void; onInstall: () => void }) {
  const colorways: Array<{ id: Colorway; label: string; color: string }> = [
    { id: "violet", label: "Violet", color: "#7c3ff2" },
    { id: "emerald", label: "Emerald", color: "#059669" },
    { id: "rose", label: "Rose", color: "#e11d48" },
  ];
  return <aside className="popup-panel popup-surface fixed right-3 top-[4.7rem] z-[80] max-h-[calc(100dvh-5.5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.75rem] p-4 sm:right-5 lg:right-8 lg:top-20" aria-label="Settings menu">
    <div className="border-b pb-4" style={{ borderColor: "rgb(var(--line))" }}><Logo /></div>
    <section className="py-4">
      <div className="mb-3 flex items-center gap-2"><Palette className="text-violet-500" size={17}/><p className="text-xs font-extrabold uppercase tracking-[.14em]">Appearance</p></div>
      <div className="grid grid-cols-2 rounded-xl bg-violet-500/7 p-1"><button type="button" className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold ${data.profile.theme === "light" ? "bg-white text-ink shadow dark:bg-white" : "muted"}`} onClick={() => onTheme("light")}><Sun size={15}/> Light</button><button type="button" className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold ${data.profile.theme === "dark" ? "bg-violet-500 text-white shadow" : "muted"}`} onClick={() => onTheme("dark")}><Moon size={15}/> Dark</button></div>
      <p className="label mt-4">Colorway</p>
      <div className="grid grid-cols-3 gap-2">{colorways.map((colorway) => <button type="button" key={colorway.id} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-bold transition ${data.profile.colorway === colorway.id ? "border-violet-500 bg-violet-500/7" : ""}`} style={{ borderColor: data.profile.colorway === colorway.id ? colorway.color : "rgb(var(--line))" }} onClick={() => onColorway(colorway.id)}><span className="size-4 rounded-full shadow-sm" style={{ backgroundColor: colorway.color }}/>{colorway.label}</button>)}</div>
    </section>
    <section className="space-y-2 border-t py-4" style={{ borderColor: "rgb(var(--line))" }}>
      <button type="button" className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-violet-500/7" style={{ borderColor: "rgb(var(--line))" }} onClick={onGoals}><span className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Target size={17}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Daily goals</span><span className="muted block text-[10px]">{data.profile.calorieGoal.toLocaleString()} cal · {data.profile.waterGoalOz} oz water</span></span><ChevronRight className="muted" size={16}/></button>
      <div className="grid grid-cols-2 gap-2"><button type="button" className="secondary-button !px-2" onClick={onExport}><Download size={16}/> Export all</button><button type="button" className="secondary-button !px-2" onClick={onImport}><Upload size={16}/> Import all</button></div>
      <p className="muted px-1 text-[10px] leading-relaxed">Export on your computer, send the JSON file to your phone, then choose Import all here.</p>
      <button type="button" className="secondary-button w-full" onClick={onInstall}><Smartphone size={16}/> Install app</button>
    </section>
    <footer className="flex items-end justify-between border-t pt-4 text-[10px]" style={{ borderColor: "rgb(var(--line))" }}><span className="muted font-bold">Version 1</span><span className="text-right"><span className="muted block">Made by:</span><strong>Thomas Askhsroun</strong></span></footer>
  </aside>;
}

function QuickAddItem({ icon, title, description, tone, onClick }: { icon: React.ReactNode; title: string; description: string; tone: string; onClick: () => void }) {
  return <button type="button" className="quick-add-menu-item flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-violet-500/7" onClick={onClick}><span className={`grid size-11 shrink-0 place-items-center rounded-2xl [&>svg]:size-[19px] ${tone}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="muted block text-[11px]">{description}</span></span><ChevronRight className="muted" size={16}/></button>;
}

function SettingsModal({ open, onClose, calorieGoal, waterGoal, onSave }: { open: boolean; onClose: () => void; calorieGoal: number; waterGoal: number; onSave: (calories: number, water: number) => void }) {
  const { notify } = useApp();
  return <Modal open={open} onClose={onClose} title="Goals & settings" description="Goals apply across all days and can be changed anytime." width="max-w-sm" footer={<button type="submit" form="settings-form" className="primary-button w-full">Save goals</button>}><form id="settings-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const calories = safeNumber(form.get("calories")); const water = safeNumber(form.get("water")); if (calories < 500 || calories > 10000 || water < 1 || water > 500) { notify("Use 500–10,000 calories and 1–500 oz of water.", "error"); return; } onSave(calories, water); }} className="space-y-4"><label><span className="label">Daily calorie goal</span><input className="input" name="calories" type="number" min="500" max="10000" step="10" defaultValue={calorieGoal} required/></label><label><span className="label">Daily water goal (oz)</span><input className="input" name="water" type="number" min="1" max="500" step="1" defaultValue={waterGoal} required/></label><div className="rounded-2xl bg-violet-500/8 p-3 text-xs leading-relaxed muted">All personal records are stored only in this browser profile. They are not sent to an account or server.</div></form></Modal>;
}
function InstallStep({ number, text }: { number: string; text: string }) { return <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "rgb(var(--line))" }}><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500 text-xs font-bold text-white">{number}</span><span className="font-semibold">{text}</span></div>; }
function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return "morning"; if (hour < 17) return "afternoon"; return "evening"; }
