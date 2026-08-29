import type { AppData } from "@/types";

/** Creates a private, empty workspace for a first-time installation. */
export function createInitialData(): AppData {
  return {
    version: 1,
    profile: {
      localUserId: `local_${Math.random().toString(36).slice(2)}`,
      displayName: "Tom",
      calorieGoal: 2200,
      waterGoalOz: 96,
      theme: "light",
      colorway: "violet",
    },
    savedFoods: [],
    foodLog: [],
    activityLog: [],
    savedWorkouts: [],
    waterLog: [],
    weightLog: [],
  };
}
