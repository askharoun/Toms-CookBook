import { addDays, format, parseISO } from "date-fns";
import type { AppData, DailyTotals, FoodLogEntry, SavedFood } from "@/types";

export const STORAGE_KEY = "toms-cookbook:data:v2";
export const LEGACY_STORAGE_KEYS = ["toms-cookbook:data:v1"] as const;

export function makeId(prefix = "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function dateKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function offsetDate(key: string, amount: number) {
  return dateKey(addDays(parseISO(key), amount));
}

export function displayDate(key: string, includeYear = false) {
  return format(parseISO(key), includeYear ? "MMM d, yyyy" : "EEE, MMM d");
}

export function caloriesForEntry(entry: FoodLogEntry) {
  return entry.caloriesPerServing * entry.servings;
}

export function packageCalories(food: Pick<SavedFood, "caloriesPerServing" | "packageQuantity">) {
  return food.caloriesPerServing * food.packageQuantity;
}

export function costPerServing(food: Pick<SavedFood, "price" | "packageQuantity">) {
  return food.packageQuantity ? food.price / food.packageQuantity : 0;
}

export function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getDailyTotals(data: AppData, date: string): DailyTotals {
  const foods = data.foodLog.filter((entry) => entry.date === date);
  const activities = data.activityLog.filter((entry) => entry.date === date);
  const water = data.waterLog.filter((entry) => entry.date === date);
  const eaten = round(foods.reduce((sum, entry) => sum + caloriesForEntry(entry), 0));
  const burned = round(activities.reduce((sum, entry) => sum + entry.activeCalories, 0));
  const net = eaten - burned;
  const macro = (key: "protein" | "carbs" | "fat") =>
    foods.reduce((sum, entry) => sum + (entry[key] || 0) * entry.servings, 0);

  return {
    eaten,
    burned,
    net,
    remaining: data.profile.calorieGoal - net,
    water: round(water.reduce((sum, entry) => sum + entry.amountOz, 0), 1),
    protein: round(macro("protein"), 1),
    carbs: round(macro("carbs"), 1),
    fat: round(macro("fat"), 1),
    workoutCalories: round(activities.reduce((sum, entry) => sum + entry.workoutCalories, 0)),
    steps: round(activities.reduce((sum, entry) => sum + (entry.steps || 0), 0)),
    distanceMiles: round(activities.reduce((sum, entry) => sum + (entry.distanceMiles || 0), 0), 2),
  };
}

export function chartData(data: AppData, endDate: string, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = offsetDate(endDate, index - days + 1);
    const totals = getDailyTotals(data, date);
    const weights = data.weightLog.filter((entry) => entry.date === date);
    const weight = weights.length
      ? round(weights.reduce((sum, item) => sum + item.pounds, 0) / weights.length, 1)
      : undefined;
    return {
      date,
      label: days > 14 ? format(parseISO(date), "M/d") : format(parseISO(date), "EEE"),
      eaten: totals.eaten,
      burned: totals.burned,
      net: totals.net,
      water: totals.water,
      weight,
    };
  });
}

export function safeNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function foodToLog(food: SavedFood, date: string, servings: number): FoodLogEntry {
  return {
    id: makeId("foodlog"),
    foodId: food.id,
    costPerServing: costPerServing(food),
    image: food.image, imageLarge: food.imageLarge, barcode: food.barcode, brand: food.brand,
    servingGrams: food.servingGrams, nutritionBasis: food.nutritionBasis,
    date,
    name: food.name,
    servings,
    caloriesPerServing: food.caloriesPerServing,
    servingDescription: food.servingDescription,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    loggedAt: new Date().toISOString(),
  };
}

export function parseStoredData(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1 || !parsed.profile || !Array.isArray(parsed.savedFoods)) return null;
    parsed.profile.colorway ||= "violet";
    return parsed;
  } catch {
    return null;
  }
}

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function loadAppData(storage: StorageAdapter) {
  return parseStoredData(storage.getItem(STORAGE_KEY));
}

export function saveAppData(storage: StorageAdapter, data: AppData) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function formatCalories(value: number) {
  return Math.round(value).toLocaleString();
}

export function clearDay(data: AppData, date: string): AppData {
  return { ...data,
    foodLog: data.foodLog.filter(entry => entry.date !== date),
    activityLog: data.activityLog.filter(entry => entry.date !== date),
    waterLog: data.waterLog.filter(entry => entry.date !== date),
    weightLog: data.weightLog.filter(entry => entry.date !== date),
  };
}
