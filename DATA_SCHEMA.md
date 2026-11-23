# Local data schema

Tom’s CookBook uses a versioned JSON document in browser `localStorage` under the key `toms-cookbook:data:v2`. There is no remote database or shared account. Browser-profile isolation is the user boundary: another person can only see the records if they can access the same browser profile on the same device.

## Root record

```text
AppData
├── version: 1
├── profile
│   ├── localUserId
│   ├── displayName
│   ├── calorieGoal
│   ├── waterGoalOz
│   ├── theme
│   └── colorway
├── savedFoods[]
├── foodLog[]
├── activityLog[]
├── savedWorkouts[]
├── waterLog[]
└── weightLog[]
```

All entities have a locally generated string `id`. Log entities use a `YYYY-MM-DD` local date key and an ISO `loggedAt` timestamp. Food logs copy nutrition values from a saved food at log time, so editing or deleting a saved food does not rewrite history.

## Collections

| Collection | Important fields | Purpose |
| --- | --- | --- |
| `savedFoods` | name, image, purchaseLink, caloriesPerServing, servingDescription, packageQuantity, price, protein/carbs/fat, notes, favorite | Reusable food library |
| `foodLog` | date, foodId, servings, copied calories and nutrition | What was eaten on a day |
| `activityLog` | date, activeCalories, workoutCalories, steps, distanceMiles, durationMinutes, source | Manual activity and reusable workout records |
| `savedWorkouts` | name, activeCalories, durationMinutes, icon | One-tap workout templates |
| `waterLog` | date, amountOz, loggedAt | Individual water additions and undo ordering |
| `weightLog` | date, pounds, timing (`morning` or `bedtime`) | Two comparable daily weight check-ins |

## Calculated values

Calculated values are not stored, which prevents stale totals:

```text
calories eaten = sum(caloriesPerServing × servings)
active calories burned = sum(activityLog.activeCalories)
net calories = calories eaten − active calories burned
remaining calories = daily calorie goal − net calories
package calories = calories per serving × package quantity
cost per serving = package price ÷ package quantity
```

Resting or basal energy is not part of `activeCalories`. Activity sources are either `manual` or `saved_workout`.

## Persistence and migration

`saveAppData` serializes the complete root document after state changes. `loadAppData` validates the schema version before accepting stored data. Future breaking changes should increment `version` and migrate older documents before rendering.


## Optional barcode metadata

Saved foods and diary snapshots may include `barcode` (a string, including leading zeros),
`brand`, `image`, `imageLarge`, `servingGrams`, and `nutritionBasis` (`serving`, `100g`, or
`100ml`). All fields are optional; schema version and the storage key remain unchanged.
Existing backups continue to load. Food-to-diary conversion copies the metadata, so
historic photos do not depend on the current library item.

`caloriesPerServing` and macros always describe the saved record's
`servingDescription`. A record labeled `100 g` uses 100 g as one stored serving;
logging 60 g stores 0.6 servings. A product with a known gram serving weight may
also be entered as servings. Milliliters are never converted to grams. Missing
calories prevent barcode logging; an explicit zero is valid. Missing macros remain
undefined. Confirmation feedback is emitted only after local storage succeeds.
