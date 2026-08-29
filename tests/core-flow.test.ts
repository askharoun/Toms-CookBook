import { describe, expect, it } from "vitest";
import { createInitialData } from "../src/lib/seed";
import { costPerServing, foodToLog, getDailyTotals, loadAppData, packageCalories, saveAppData } from "../src/lib/utils";
import type { SavedFood } from "../src/types";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("main local-first tracking flow", () => {
  it("starts a new installation with no personal records", () => {
    const data = createInitialData();
    expect(data.savedFoods).toEqual([]);
    expect(data.foodLog).toEqual([]);
    expect(data.activityLog).toEqual([]);
    expect(data.savedWorkouts).toEqual([]);
    expect(data.waterLog).toEqual([]);
    expect(data.weightLog).toEqual([]);
  });

  it("saves a food, logs servings, activity, and water, then preserves updated totals after refresh", () => {
    const date = "2099-01-01";
    const data = createInitialData();
    const oatmeal: SavedFood = {
      id: "food_test_oatmeal",
      name: "Protein oatmeal",
      caloriesPerServing: 240,
      servingDescription: "1 bowl",
      packageQuantity: 5,
      price: 6,
      protein: 18,
      carbs: 34,
      fat: 5,
      favorite: true,
      createdAt: new Date().toISOString(),
    };

    data.savedFoods.unshift(oatmeal);
    data.foodLog.unshift(foodToLog(oatmeal, date, 2));
    data.activityLog.unshift({
      id: "activity_test",
      date,
      name: "Daily active calories",
      activeCalories: 320,
      workoutCalories: 180,
      steps: 7200,
      distanceMiles: 3.2,
      source: "manual",
      loggedAt: new Date().toISOString(),
    });
    data.waterLog.push({ id: "water_test_1", date, amountOz: 16.9, loggedAt: new Date().toISOString() });
    data.waterLog.push({ id: "water_test_2", date, amountOz: 24, loggedAt: new Date().toISOString() });

    expect(packageCalories(oatmeal)).toBe(1200);
    expect(costPerServing(oatmeal)).toBe(1.2);
    expect(getDailyTotals(data, date)).toMatchObject({
      eaten: 480,
      burned: 320,
      net: 160,
      remaining: 2040,
      water: 40.9,
      protein: 36,
      carbs: 68,
      fat: 10,
      steps: 7200,
      distanceMiles: 3.2,
    });

    const browserStorage = new MemoryStorage();
    saveAppData(browserStorage, data);
    const afterRefresh = loadAppData(browserStorage);

    expect(afterRefresh).not.toBeNull();
    expect(afterRefresh?.savedFoods[0].name).toBe("Protein oatmeal");
    expect(getDailyTotals(afterRefresh!, date)).toEqual(getDailyTotals(data, date));
  });
});
