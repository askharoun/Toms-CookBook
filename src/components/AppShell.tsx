"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Bell, CircleHelp, RotateCcw, ChevronRight, Download, Droplets, Flame, LayoutDashboard, Moon, Palette, Plus, Settings, Smartphone, Sun, Target, Upload, Utensils, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { shareOrDownloadFile } from "@/lib/fileExport";
import { dateKey, parseStoredData, safeNumber } from "@/lib/utils";
import type { AppData, Colorway } from "@/types";
import { DynamicFavicon } from "./DynamicFavicon";
import { NamePrompt } from "./NamePrompt";
import { DailyReminders } from "./DailyReminders";
import { SaveFeedback } from "./SaveFeedback";
import { ActivityTab } from "./ActivityTab";
import { DashboardTab } from "./DashboardTab";
import { FoodTab } from "./FoodTab";
import { WaterTab } from "./WaterTab";
import { ConfirmDialog, DateNavigator, Logo, Modal, Skeleton, Toast } from "./ui";

type Tab = "dashboard" | "food" | "activity" | "water";
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

const NAV_ITEMS = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "food" as const, label: "Food diary", mobileLabel: "Food", icon: Utensils },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "water" as const, label: "Water", icon: Droplets },
];

export function AppShell() {
  const { data, hydrated, toast, setTheme, setColorway, replaceData, resetDay, resetApp, setDisplayName, updateGoals, notify } = useApp();
  const [namePromptDismissed, setNamePromptDismissed] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [hardResetOpen, setHardResetOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
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
  const namePromptOpen = !namePromptDismissed && (!data.profile.nameConfirmed || !data.profile.displayName.trim());

  const titles: Record<Tab, { eyebrow: string; title: string; description: string }> = {
    dashboard: { eyebrow: "Daily overview", title: `Good ${getGreeting()}${data.profile.displayName.trim() ? `, ${data.profile.displayName.trim()}` : ""}`, description: "Your food, movement, hydration, and progress in one place." },
    food: { eyebrow: "Food + calendar", title: "Food diary", description: "Build your library once, then log servings on any day." },
    activity: { eyebrow: "Movement", title: "Activity", description: "Track active energy, workouts, steps, and distance." },
    water: { eyebrow: "Hydration", title: "Water", description: "Small sips add up. Keep your daily streak moving." },
  };
  const heading = titles[tab];

  return (
    <div className={`${helpVisible ? "help-enabled " : ""}min-h-screen w-full min-w-0 overflow-x-hidden lg:grid lg:grid-cols-[248px_1fr]`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col px-4 py-6 lg:flex" style={{ background: "rgb(var(--surface) / .72)", backdropFilter: "blur(18px)" }}>
        <div className="px-2"><Logo /></div>
        <nav className="mt-9 space-y-1" aria-label="Main navigation">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${tab === id ? "bg-violet-500 text-white shadow-glow" : "muted hover:bg-violet-500/7 hover:text-violet-500"}`} onClick={() => navigateToTab(id)}><Icon size={19}/>{label}</button>)}</nav>
        <div className="mt-6 border-t pt-6" style={{ borderColor: "rgb(var(--line))" }}>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold muted hover:bg-violet-500/7 hover:text-violet-500" onClick={() => setSettingsOpen(true)}><Settings size={19}/>Profile & goals</button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold muted hover:bg-violet-500/7 hover:text-violet-500" onClick={requestInstall}><Download size={19}/>Install app</button>
        </div>
        <div className="help-copy mt-auto rounded-2xl bg-violet-500/8 p-4"><div className="mb-2 flex items-center gap-2 text-violet-500"><Smartphone size={16}/><span className="text-xs font-extrabold uppercase tracking-wider">Private by design</span></div><p className="muted text-[11px] leading-relaxed">Your personal data stays in this browser’s local storage on this device.</p></div>
      </aside>

      <DynamicFavicon />
      <main className="min-w-0 pb-28 lg:col-start-2 lg:pb-8">
        <header className="app-header sticky top-0 z-30 border-b px-4 py-3 lg:static lg:border-0 lg:px-8 lg:pb-4 lg:pt-7">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3">
            <div className="lg:hidden"><Logo compact /></div>
            <div className="hidden min-w-0 lg:block"><p className="muted text-[10px] font-extrabold uppercase tracking-[.18em]">{heading.eyebrow}</p><h1 className="heading mt-0.5 truncate text-3xl">{heading.title}</h1><p className="help-copy muted mt-1 text-sm">{heading.description}</p></div>
            <DateNavigator date={selectedDate} setDate={setSelectedDate}/>
            <div className="flex items-center gap-2">
              <button type="button" className="icon-button hidden sm:inline-flex" onClick={() => setTheme(data.profile.theme === "light" ? "dark" : "light")} aria-label={`Switch to ${data.profile.theme === "light" ? "dark" : "light"} mode`}>{data.profile.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button>
              <button type="button" className={`icon-button ${settingsMenuOpen ? "border-violet-500 bg-violet-500/10 text-violet-500" : ""}`} onClick={() => setSettingsMenuOpen((value) => !value)} aria-label="Open settings menu" aria-expanded={settingsMenuOpen}><Settings size={18}/></button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1380px] px-4 pt-5 lg:px-8 lg:pt-0">
          <div className="mb-5 lg:hidden"><p className="muted text-[10px] font-extrabold uppercase tracking-[.18em]">{heading.eyebrow}</p><h1 className="heading mt-0.5 text-2xl">{heading.title}</h1><p className="help-copy muted mt-1 text-xs">{heading.description}</p></div>
          <div className="mb-5 hidden items-center justify-end gap-2 xl:flex"><button type="button" className="primary-button" onClick={() => goToAction("food")}><Utensils size={16}/> Add food</button><button type="button" className="secondary-button" onClick={() => goToAction("activity")}><Flame size={16}/> Add activity</button><button type="button" className="secondary-button" onClick={() => goToAction("water")}><Droplets size={16}/> Add water</button></div>
          {tab === "dashboard" && <DashboardTab date={selectedDate} onAddFood={() => goToAction("food")} onAddWater={() => goToAction("water")}/>} 
          {tab === "food" && <FoodTab key={`food-${foodAction ? "quick" : "nav"}`} date={selectedDate} startInLibrary={foodAction}/>} 
          {tab === "activity" && <ActivityTab date={selectedDate} requestedAction={activityAction} onActionHandled={() => setActivityAction(false)}/>} 
          {tab === "water" && <WaterTab date={selectedDate} requestedAction={waterAction} onActionHandled={() => setWaterAction(false)}/>} 
        </div>
      </main>

      {settingsMenuOpen && <><button type="button" className="fixed inset-0 z-[70] cursor-default bg-transparent" onClick={() => setSettingsMenuOpen(false)} aria-label="Close settings menu"/><SettingsDropdown onHardReset={() => { setSettingsMenuOpen(false); setResetPhrase(""); setHardResetOpen(true); }} helpVisible={helpVisible} onHelp={() => setHelpVisible(value => !value)} onReminders={() => { setSettingsMenuOpen(false); setRemindersOpen(true); }} onReset={() => { setSettingsMenuOpen(false); setResetOpen(true); }} data={data} onTheme={setTheme} onColorway={setColorway} onGoals={() => { setSettingsMenuOpen(false); setSettingsOpen(true); }} onExport={exportBackup} onImport={() => backupInputRef.current?.click()} onInstall={() => { setSettingsMenuOpen(false); requestInstall(); }}/></>}
      <input ref={backupInputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => readBackup(event.target.files?.[0])}/>

      {quickOpen && <><button type="button" className="quick-add-backdrop fixed inset-0 z-[60] cursor-default bg-ink/15 lg:hidden" onClick={() => setQuickOpen(false)} aria-label="Close quick add menu"/><div className="quick-add-menu popup-surface fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-[65] mx-auto max-h-[60dvh] max-w-sm overflow-y-auto overflow-x-hidden rounded-[1.75rem] p-3 lg:hidden"><div className="mb-2 flex items-start justify-between gap-3 px-2 pt-1"><div className="min-w-0"><p className="heading break-words text-lg">Add entry</p></div><button type="button" className="icon-button !size-9 shrink-0 border-0 bg-violet-500/7" onClick={() => setQuickOpen(false)} aria-label="Close quick add menu"><X size={17}/></button></div><QuickAddItem icon={<Utensils/>} title="Food" description="Choose a saved food" tone="bg-orange-500/10 text-orange-500" onClick={() => goToAction("food")}/><QuickAddItem icon={<Flame/>} title="Activity" description="Record calories or a workout" tone="bg-violet-500/10 text-violet-500" onClick={() => goToAction("activity")}/><QuickAddItem icon={<Droplets/>} title="Water" description="Use a quick size or custom amount" tone="bg-sky-500/10 text-sky-500" onClick={() => goToAction("water")}/></div></>}
      <nav className="mobile-nav safe-bottom fixed inset-x-0 bottom-0 z-[70] grid grid-cols-5 px-2 pt-2 lg:hidden" aria-label="Mobile navigation"><div className="nav-surface" aria-hidden="true"><span/><div><svg viewBox="0 0 120 40" preserveAspectRatio="none"><path d="M0 40 C20 40 22 4 46 4 H74 C98 4 100 40 120 40 Z"/></svg></div><span/></div>{NAV_ITEMS.map(({ id, label, mobileLabel, icon: Icon }, index) => <button type="button" key={id} style={{ gridColumn: index < 2 ? index + 1 : index + 2, gridRow: 1 }} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${tab === id ? "text-violet-500" : "muted"}`} onClick={() => navigateToTab(id)}><Icon size={20} strokeWidth={tab === id ? 2.6 : 2}/><span>{mobileLabel || label}</span></button>)}<button type="button" className={`nav-add ${quickOpen ? "is-open" : ""}`} style={{ gridColumn: 3, gridRow: 1 }} onClick={() => setQuickOpen(value => !value)} aria-label={quickOpen ? "Close add menu" : "Open add menu"} aria-expanded={quickOpen}><Plus size={25} strokeWidth={2.2}/></button></nav>

      <SettingsModal displayName={data.profile.displayName} open={settingsOpen} onClose={() => setSettingsOpen(false)} calorieGoal={data.profile.calorieGoal} waterGoal={data.profile.waterGoalOz} onSave={(calorieGoal, waterGoal, displayName) => { updateGoals(calorieGoal, waterGoal); setDisplayName(displayName); notify("Profile updated."); setSettingsOpen(false); }}/>
      <ConfirmDialog open={pendingImport !== null} title="Import this complete backup?" description="This replaces all food, activity, water, weight, goals, and settings currently stored on this device." confirmLabel="Import and replace" tone="primary" onClose={() => setPendingImport(null)} onConfirm={() => { if (pendingImport) { replaceData(pendingImport); notify("Backup imported. All data is now available on this device."); } setPendingImport(null); scrollToTop(); }}/>
      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Install Tom’s CookBook" description="Keep it one tap away and use your previously loaded tracker offline." width="max-w-sm" footer={<button type="button" className="primary-button w-full" onClick={() => setInstallOpen(false)}>Got it</button>}><div className="space-y-3 text-sm"><InstallStep number="1" text="On iPhone, tap the Share button in Safari."/><InstallStep number="2" text="Choose “Add to Home Screen.”"/><InstallStep number="3" text="Tap Add to install the app icon."/><div className="mt-4 rounded-2xl bg-violet-500/8 p-3 text-xs muted">On desktop, use the install icon in the browser address bar if this browser does not show an automatic prompt.</div></div></Modal>
      {namePromptOpen ? <NamePrompt onDismiss={() => setNamePromptDismissed(true)} /> : <DailyReminders manageOpen={remindersOpen} onClose={() => setRemindersOpen(false)} />}
      <ConfirmDialog open={resetOpen} title={`Reset ${selectedDate}?`} description="This clears food, activity, water, and weight entries for this date. Saved foods, workouts, goals, and reminders stay intact. This cannot be undone." confirmLabel="Reset day" onClose={() => setResetOpen(false)} onConfirm={() => { resetDay(selectedDate); setResetOpen(false); notify("Day reset."); }}/>
      <Modal open={hardResetOpen} onClose={() => setHardResetOpen(false)} title="Reset the whole app?" descriptionIsHelp={false} description="Permanently delete all logs, saved foods, workouts, reminders, your name, and settings on this device. Export a backup first if you want to keep them." width="max-w-sm" footer={<div className="flex gap-3"><button className="secondary-button flex-1" onClick={() => setHardResetOpen(false)}>Cancel</button><button type="submit" form="hard-reset-form" className="danger-button flex-1" disabled={resetPhrase !== "RESET"}>Reset everything</button></div>}><form id="hard-reset-form" onSubmit={event => { event.preventDefault(); if (resetPhrase !== "RESET") return; if (resetApp()) window.location.reload(); }}><label><span className="label">Type RESET to confirm</span><input className="input" value={resetPhrase} onChange={event => setResetPhrase(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} /></label></form></Modal>
      <Toast toast={toast}/><SaveFeedback />
    </div>
  );
}

function SettingsDropdown({ onHardReset, helpVisible, onHelp, onReminders, onReset, data, onTheme, onColorway, onGoals, onExport, onImport, onInstall }: { onHardReset: () => void; helpVisible: boolean; onHelp: () => void; onReminders: () => void; onReset: () => void; data: AppData; onTheme: (theme: AppData["profile"]["theme"]) => void; onColorway: (colorway: Colorway) => void; onGoals: () => void; onExport: () => void; onImport: () => void; onInstall: () => void }) {
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
      <button type="button" className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-violet-500/7" style={{ borderColor: "rgb(var(--line))" }} onClick={onGoals}><span className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Target size={17}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Profile & goals</span><span className="muted block text-[10px]">{data.profile.calorieGoal.toLocaleString()} cal · {data.profile.waterGoalOz} oz water</span></span><ChevronRight className="muted" size={16}/></button>
      <button className="secondary-button w-full" onClick={onReminders}><Bell size={17}/> Reminders</button>
      <button className="secondary-button w-full" onClick={onHelp} aria-pressed={helpVisible}><CircleHelp size={17}/>{helpVisible ? "Hide help" : "Show help"}</button>
      <button className="secondary-button w-full" onClick={onReset}><RotateCcw size={17}/> Reset selected day</button>
      <div className="grid grid-cols-2 gap-2"><button type="button" className="secondary-button !px-2" onClick={onExport}><Download size={16}/> Export all</button><button type="button" className="secondary-button !px-2" onClick={onImport}><Upload size={16}/> Import all</button></div>
      <p className="help-copy muted px-1 text-[10px] leading-relaxed">Export on your computer, send the JSON file to your phone, then choose Import all here.</p>
      <button type="button" className="secondary-button w-full" onClick={onInstall}><Smartphone size={16}/> Install app</button>
    </section>
    <button type="button" className="danger-button mb-4 w-full" onClick={onHardReset}>Reset entire app</button>
    <footer className="flex items-end justify-between border-t pt-4 text-[10px]" style={{ borderColor: "rgb(var(--line))" }}><span className="muted font-bold">Version 1</span><span className="text-right"><span className="muted block">Made by:</span><strong>Thomas Askhsroun</strong></span></footer>
  </aside>;
}

function QuickAddItem({ icon, title, description, tone, onClick }: { icon: React.ReactNode; title: string; description: string; tone: string; onClick: () => void }) {
  return <button type="button" className="quick-add-menu-item flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-violet-500/7" onClick={onClick}><span className={`grid size-11 shrink-0 place-items-center rounded-2xl [&>svg]:size-[19px] ${tone}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="help-copy muted block text-[11px]">{description}</span></span><ChevronRight className="muted" size={16}/></button>;
}

function SettingsModal({ displayName, open, onClose, calorieGoal, waterGoal, onSave }: { displayName: string; open: boolean; onClose: () => void; calorieGoal: number; waterGoal: number; onSave: (calories: number, water: number, displayName: string) => void }) {
  const { notify } = useApp();
  return <Modal open={open} onClose={onClose} title="Profile & goals" description="Goals apply across all days and can be changed anytime." width="max-w-sm" footer={<button type="submit" form="settings-form" className="primary-button w-full">Save changes</button>}><form id="settings-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const calories = safeNumber(form.get("calories")); const water = safeNumber(form.get("water")); if (calories < 500 || calories > 10000 || water < 1 || water > 500) { notify("Use 500–10,000 calories and 1–500 oz of water.", "error"); return; } onSave(calories, water, String(form.get("displayName") || "").trim()); }} className="space-y-4"><label><span className="label">Your name</span><input className="input" name="displayName" defaultValue={displayName} placeholder="Your name" maxLength={40} autoComplete="given-name" /></label><label><span className="label">Daily calorie goal</span><input className="input" name="calories" type="number" inputMode="decimal" min="500" max="10000" step="10" defaultValue={calorieGoal} required/></label><label><span className="label">Daily water goal (oz)</span><input className="input" name="water" type="number" inputMode="decimal" min="1" max="500" step="1" defaultValue={waterGoal} required/></label><div className="help-copy rounded-2xl bg-violet-500/8 p-3 text-xs leading-relaxed muted">All personal records are stored only in this browser profile. They are not sent to an account or server.</div></form></Modal>;
}
function InstallStep({ number, text }: { number: string; text: string }) { return <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "rgb(var(--line))" }}><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500 text-xs font-bold text-white">{number}</span><span className="font-semibold">{text}</span></div>; }
function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return "morning"; if (hour < 17) return "afternoon"; return "evening"; }
