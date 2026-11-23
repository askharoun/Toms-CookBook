export type ThemeMode = "light" | "dark";
export type Colorway = "violet" | "emerald" | "rose";
export type ActivitySource = "manual" | "saved_workout";
export type WeightTiming = "morning" | "bedtime";

export interface Nutrition {
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ProductMetadata {
  image?: string;
  imageLarge?: string;
  barcode?: string;
  brand?: string;
  servingGrams?: number;
  nutritionBasis?: "100g" | "100ml" | "serving";
}

export interface SavedFood extends Nutrition, ProductMetadata {
  id: string;
  name: string;
  image?: string;
  purchaseLink?: string;
  caloriesPerServing: number;
  servingDescription: string;
  packageQuantity: number;
  price: number;
  notes?: string;
  favorite: boolean;
  createdAt: string;
}

export interface FoodLogEntry extends Nutrition, ProductMetadata {
  id: string;
  foodId?: string;
  date: string;
  name: string;
  servings: number;
  caloriesPerServing: number;
  servingDescription: string;
  loggedAt: string;
}

export interface ActivityEntry {
  id: string;
  date: string;
  name: string;
  activeCalories: number;
  workoutCalories: number;
  steps?: number;
  distanceMiles?: number;
  durationMinutes?: number;
  source: ActivitySource;
  loggedAt: string;
}

export interface SavedWorkout {
  id: string;
  name: string;
  activeCalories: number;
  durationMinutes?: number;
  icon: "walk" | "strength" | "cycle" | "run";
}

export interface WaterEntry {
  id: string;
  date: string;
  amountOz: number;
  loggedAt: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  pounds: number;
  timing: WeightTiming;
  loggedAt: string;
}

export interface AppProfile {
  localUserId: string;
  displayName: string;
  calorieGoal: number;
  waterGoalOz: number;
  theme: ThemeMode;
  colorway: Colorway;
}

export interface AppData {
  version: 1;
  profile: AppProfile;
  savedFoods: SavedFood[];
  foodLog: FoodLogEntry[];
  activityLog: ActivityEntry[];
  savedWorkouts: SavedWorkout[];
  waterLog: WaterEntry[];
  weightLog: WeightEntry[];
}

export interface DailyTotals {
  eaten: number;
  burned: number;
  net: number;
  remaining: number;
  water: number;
  protein: number;
  carbs: number;
  fat: number;
  workoutCalories: number;
  steps: number;
  distanceMiles: number;
}

export type ToastState = { message: string; tone: "success" | "error" } | null;
