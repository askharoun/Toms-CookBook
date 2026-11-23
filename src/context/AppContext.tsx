"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActivityEntry,
  AppData,
  Colorway,
  FoodLogEntry,
  SavedFood,
  SavedWorkout,
  ThemeMode,
  ToastState,
  WaterEntry,
  WeightEntry,
} from "@/types";
import { createInitialData } from "@/lib/seed";
import { loadAppData, saveAppData } from "@/lib/utils";

type Confirmation = { id: string; kind: "food" | "water"; amount?: number } | null;
interface AppContextValue {
  confirmation: Confirmation;
  data: AppData;
  hydrated: boolean;
  toast: ToastState;
  notify: (message: string, tone?: "success" | "error") => void;
  addFood: (food: SavedFood) => void;
  updateFood: (food: SavedFood) => void;
  deleteFood: (id: string) => void;
  setFoods: (foods: SavedFood[]) => void;
  addFoodLog: (entry: FoodLogEntry) => void;
  updateFoodLog: (entry: FoodLogEntry) => void;
  deleteFoodLog: (id: string) => void;
  addActivity: (entry: ActivityEntry) => void;
  deleteActivity: (id: string) => void;
  addSavedWorkout: (entry: SavedWorkout) => void;
  deleteSavedWorkout: (id: string) => void;
  addWater: (entry: WaterEntry) => void;
  deleteWater: (id: string) => void;
  undoWater: (date: string) => boolean;
  addWeight: (entry: WeightEntry) => void;
  deleteWeight: (id: string) => void;
  updateGoals: (calorieGoal: number, waterGoalOz: number) => void;
  setTheme: (theme: ThemeMode) => void;
  setColorway: (colorway: Colorway) => void;
  replaceData: (data: AppData) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => createInitialData());
  const [hydrated, setHydrated] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const pendingConfirmation = useRef<Confirmation>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [toast, setToast] = useState<ToastState>(null);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let stored: AppData | null = null;
    let storageUnavailable = false;
    try {
      // Keep legacy storage intact for recovery and older backups.
      stored = loadAppData(localStorage);
    } catch {
      storageUnavailable = true;
    }
    const timer = window.setTimeout(() => {
      if (stored) setData(stored);
      setHydrated(true);
      if (storageUnavailable) notify("Local storage is unavailable. Changes may not persist.", "error");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notify]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveAppData(localStorage, data);
      if (pendingConfirmation.current) {
        const saved = pendingConfirmation.current; pendingConfirmation.current = null;
        setTimeout(() => setConfirmation(saved), 0);
      }
    } catch {
      pendingConfirmation.current = null;
      window.setTimeout(() => notify("Storage is full. Export a backup or remove large product images.", "error"), 0);
    }
    document.documentElement.classList.toggle("dark", data.profile.theme === "dark");
    document.documentElement.dataset.accent = data.profile.colorway || "violet";
  }, [data, hydrated, notify]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 2400);
    return () => clearTimeout(timer);
  }, [confirmation]);

  const value = useMemo<AppContextValue>(() => ({
    data,
    confirmation,
    hydrated,
    toast,
    notify,
    addFood: (food) => setData((current) => ({ ...current, savedFoods: [food, ...current.savedFoods] })),
    updateFood: (food) => setData((current) => ({ ...current, savedFoods: current.savedFoods.map((item) => item.id === food.id ? food : item) })),
    deleteFood: (id) => setData((current) => ({ ...current, savedFoods: current.savedFoods.filter((item) => item.id !== id) })),
    setFoods: (foods) => setData((current) => ({ ...current, savedFoods: foods })),
    addFoodLog: (entry) => { pendingConfirmation.current = { id: entry.id, kind: "food" }; setData((current) => ({ ...current, foodLog: [entry, ...current.foodLog] })); },
    updateFoodLog: (entry) => setData((current) => ({ ...current, foodLog: current.foodLog.map((item) => item.id === entry.id ? entry : item) })),
    deleteFoodLog: (id) => setData((current) => ({ ...current, foodLog: current.foodLog.filter((item) => item.id !== id) })),
    addActivity: (entry) => setData((current) => ({ ...current, activityLog: [entry, ...current.activityLog] })),
    deleteActivity: (id) => setData((current) => ({ ...current, activityLog: current.activityLog.filter((item) => item.id !== id) })),
    addSavedWorkout: (entry) => setData((current) => ({ ...current, savedWorkouts: [entry, ...current.savedWorkouts] })),
    deleteSavedWorkout: (id) => setData((current) => ({ ...current, savedWorkouts: current.savedWorkouts.filter((item) => item.id !== id) })),
    addWater: (entry) => { pendingConfirmation.current = { id: entry.id, kind: "water", amount: entry.amountOz }; setData((current) => ({ ...current, waterLog: [...current.waterLog, entry] })); },
    deleteWater: (id) => setData((current) => ({ ...current, waterLog: current.waterLog.filter((item) => item.id !== id) })),
    undoWater: (date) => {
      const entries = data.waterLog.filter((item) => item.date === date).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      if (!entries[0]) return false;
      setData((current) => ({ ...current, waterLog: current.waterLog.filter((item) => item.id !== entries[0].id) }));
      return true;
    },
    addWeight: (entry) => setData((current) => ({ ...current, weightLog: [entry, ...current.weightLog.filter((item) => !(item.date === entry.date && item.timing === entry.timing))] })),
    deleteWeight: (id) => setData((current) => ({ ...current, weightLog: current.weightLog.filter((item) => item.id !== id) })),
    updateGoals: (calorieGoal, waterGoalOz) => setData((current) => ({ ...current, profile: { ...current.profile, calorieGoal, waterGoalOz } })),
    setTheme: (theme) => setData((current) => ({ ...current, profile: { ...current.profile, theme } })),
    setColorway: (colorway) => setData((current) => ({ ...current, profile: { ...current.profile, colorway } })),
    replaceData: (nextData) => setData({ ...nextData, profile: { ...nextData.profile, colorway: nextData.profile.colorway || "violet" } }),
  }), [data, hydrated, notify, toast, confirmation]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
