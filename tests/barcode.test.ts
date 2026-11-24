import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeProduct, packageAmountForUnit, portionFactor, productToFood } from "../src/lib/barcode";
import { GET } from "../src/app/api/barcode/route";
import { foodToLog, getDailyTotals, parseStoredData } from "../src/lib/utils";
import { createInitialData } from "../src/lib/seed";

afterEach(() => vi.unstubAllGlobals());
describe("barcode lookup and diary integration", () => {
  it("preserves leading zeros, requests photos, and logs a gram portion with copied metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 1, product: { product_name: "Oats", brands: "Test", serving_size: "40 g", nutriments: { "energy-kcal_100g": 400, proteins_100g: 10 }, image_front_small_url: "https://images.openfoodfacts.org/small.jpg", image_front_url: "https://images.openfoodfacts.org/large.jpg" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(new Request("http://localhost/api/barcode?code=0012345678905"));
    const { product } = await response.json();
    expect(fetcher.mock.calls[0][0]).toContain("/0012345678905.json");
    expect(fetcher.mock.calls[0][0]).toContain("image_front_small_url");
    expect(fetcher.mock.calls[0][1].headers["User-Agent"]).toContain("TomsCookBook/");
    const food = productToFood(product, "oats");
    const data = createInitialData(); data.savedFoods.push(food);
    const entry = foodToLog(food, "2026-11-23", portionFactor(product, 60, "grams"));
    data.foodLog.push(entry);
    expect(getDailyTotals(data, entry.date)).toMatchObject({ eaten: 240, protein: 6 });
    expect(entry.image).toBe(product.image);
    expect(portionFactor(product, 1.5, "serving")).toBe(.6);
    data.foodLog.push(foodToLog(food, entry.date, .6));
    expect(data.foodLog[0].id).not.toBe(data.foodLog[1].id);
    expect(getDailyTotals(data, entry.date).eaten).toBe(480);
    expect(parseStoredData(JSON.stringify(data))?.foodLog[0].barcode).toBe("0012345678905");
    data.foodLog[0].servings = 1; expect(getDailyTotals(data, entry.date).eaten).toBe(640);
    data.foodLog.shift(); expect(getDailyTotals(data, entry.date).eaten).toBe(240);
  });
  it("allows calories without a picture and distinguishes missing energy from genuine zero", () => {
    const product = normalizeProduct({ nutriments: { "energy-kcal_serving": 120 }, serving_size: "1 cup" }, "12345678");
    expect(productToFood(product, "food").image).toBeUndefined();
    expect(portionFactor(product, 2, "serving")).toBe(2);
    expect(() => portionFactor(product, 30, "grams")).toThrow();
    expect(() => productToFood(normalizeProduct({ nutriments: {} }, "12345678"), "food")).toThrow();
    expect(productToFood(normalizeProduct({ nutriments: { "energy-kcal_serving": 0 } }, "12345678"), "zero").caloriesPerServing).toBe(0);
  });
  it("keeps macros on the energy basis and never converts ml into grams", () => {
    const p = normalizeProduct({ serving_size: "250 ml", serving_quantity: 250, nutriments: { "energy-kcal_serving": 100, proteins_100g: 9, fat_serving: 2 } }, "12345678");
    expect(p.servingGrams).toBeUndefined(); expect(p.protein).toBeUndefined(); expect(p.fat).toBe(2);
    expect(() => portionFactor(p, 100, "grams")).toThrow();
    expect(normalizeProduct({ nutriments: { "energy_100g": 418.4 } }, "12345678").calories).toBeCloseTo(100);
    const liquid = normalizeProduct({ serving_size: "250 ml", nutriments: { "energy-kcal_100g": 40 } }, "12345678");
    expect(liquid.basis).toBe("100ml");
    expect(portionFactor(liquid, 250, "ml")).toBe(2.5);
    expect(() => portionFactor(liquid, 250, "grams")).toThrow();
    const weighed = normalizeProduct({ serving_size: "40 g", nutriments: { "energy-kcal_serving": 160, proteins_100g: 10 } }, "12345678");
    expect(weighed.protein).toBe(4);
  });
  it("handles unknown products, upstream failures, and invalid input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: 0 })));
    expect((await GET(new Request("http://localhost/api/barcode?code=00000000"))).status).toBe(404);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await GET(new Request("http://localhost/api/barcode?code=00000000"))).status).toBe(502);
    expect((await GET(new Request("http://localhost/api/barcode?code=12e34567"))).status).toBe(400);
  });
});

 describe("package pricing", () => {
  it("scales package price to gram portions and keeps historical costs", () => {
    const product = normalizeProduct({ serving_size: "40 g", nutriments: { "energy-kcal_100g": 400 } }, "12345678");
    const food = productToFood(product, "oats", { price: 6, amount: 500, unit: "grams" });
    expect(food.packageQuantity).toBe(5);
    const entry = foodToLog(food, "2026-11-23", portionFactor(product, 60, "grams"));
    expect(entry.costPerServing! * entry.servings).toBeCloseTo(.72);
    food.price = 10;
    expect(entry.costPerServing! * entry.servings).toBeCloseTo(.72);
    expect(JSON.parse(JSON.stringify(entry)).costPerServing).toBe(1.2);
  });
  it("supports servings, volume, free packages, and rejects invalid purchases", () => {
    const product = normalizeProduct({ nutriments: { "energy-kcal_serving": 120 } }, "12345678");
    expect(productToFood(product, "food", { price: 8, amount: 4, unit: "serving" })).toMatchObject({ price: 8, packageQuantity: 4 });
    const liquid = normalizeProduct({ nutrition_data_per: "100ml", nutriments: { "energy-kcal_100g": 40 } }, "12345678");
    const food = productToFood(liquid, "drink", { price: 4, amount: 1000, unit: "ml" });
    const entry = foodToLog(food, "2026-11-23", portionFactor(liquid, 250, "ml"));
    expect(entry.costPerServing! * entry.servings).toBe(1);
    expect(productToFood(product, "free", { price: 0, amount: 4, unit: "serving" }).price).toBe(0);
    for (const price of [-1, Infinity, NaN]) expect(() => productToFood(product, "bad", { price, amount: 4, unit: "serving" })).toThrow();
    expect(() => productToFood(product, "bad", { price: 4, amount: 0, unit: "serving" })).toThrow();
  });
});

describe("automatic package amounts", () => {
  it("calculates servings from matching package and serving weights", () => {
    const p = normalizeProduct({ product_quantity: 500, product_quantity_unit: "g", serving_size: "40 g", nutriments: { "energy-kcal_serving": 160 } }, "12345678");
    expect(p.packageServings).toBe(12.5);
    expect(packageAmountForUnit(p, "grams")).toBe(500);
    expect(packageAmountForUnit(p, "serving")).toBe(12.5);
    expect(productToFood(p, "oats").packageQuantity).toBe(12.5);
  });
  it("uses explicit normalized serving units for liquid portions and costs", () => {
    const p = normalizeProduct({ product_quantity: 1000, product_quantity_unit: "ml", serving_quantity: 250, serving_quantity_unit: "ml", serving_size: "1 cup", nutriments: { "energy-kcal_serving": 100 } }, "12345678");
    expect(p.packageServings).toBe(4);
    expect(portionFactor(p, 125, "ml")).toBe(.5);
    expect(productToFood(p, "drink", { price: 8, amount: p.packageServings!, unit: "serving" }).packageQuantity).toBe(4);
    const per100 = normalizeProduct({ product_quantity: 1000, product_quantity_unit: "ml", serving_size: "250 ml", nutriments: { "energy-kcal_100g": 40 } }, "12345678");
    expect(portionFactor(per100, 1, "serving")).toBe(2.5);
    expect(productToFood(per100, "drink").packageQuantity).toBe(10);
  });
  it("leaves missing or incompatible amounts for manual entry", () => {
    for (const raw of [ {}, { product_quantity: 500 }, { product_quantity: 500, product_quantity_unit: "ml", serving_size: "40 g" }, { product_quantity: 0, product_quantity_unit: "g", serving_size: "40 g" } ]) {
      const p = normalizeProduct(raw, "12345678");
      expect(packageAmountForUnit(p, "serving")).toBeUndefined();
    }
  });
});
