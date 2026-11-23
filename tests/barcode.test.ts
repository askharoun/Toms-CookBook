import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeProduct, portionFactor, productToFood } from "../src/lib/barcode";
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
