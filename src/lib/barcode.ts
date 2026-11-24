import type { SavedFood } from "../types";

export interface Product {
  barcode: string; name: string; brand?: string; image?: string; imageLarge?: string;
  servingSize?: string; servingGrams?: number; servingMl?: number; packageGrams?: number; packageMl?: number; packageServings?: number; basis: "100g" | "100ml" | "serving";
  calories?: number; protein?: number; carbs?: number; fat?: number;
}
const number = (value: unknown): number | undefined => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const text = (value: unknown) => typeof value === "string" ? value : undefined;
const photo = (value: unknown) => typeof value === "string" && value.startsWith("https://") ? value : undefined;
export function normalizeProduct(raw: Record<string, unknown>, barcode: string): Product {
  const n = (raw.nutriments || {}) as Record<string, unknown>;
  const servingSize = text(raw.serving_size);
  // OFF serving_quantity may be milliliters. Only explicit mass supports grams.
  const gramsMatch = servingSize?.match(/(?:^|[\s(])(\d+(?:\.\d+)?)\s*g(?:\b|\))/i);
  const servingGrams = raw.serving_quantity_unit === "g" && number(raw.serving_quantity) ? number(raw.serving_quantity) : gramsMatch && Number(gramsMatch[1]) > 0 ? Number(gramsMatch[1]) : undefined;
  const mlMatch = servingSize?.match(/(?:^|[\s(])(\d+(?:\.\d+)?)\s*ml\b/i);
  const servingMl = raw.serving_quantity_unit === "ml" && number(raw.serving_quantity) ? number(raw.serving_quantity) : mlMatch && Number(mlMatch[1]) > 0 ? Number(mlMatch[1]) : undefined;
  // The API normalizes package quantity to grams or ml; never mix the two.
  const quantity = number(raw.product_quantity);
  const quantityUnit = text(raw.product_quantity_unit)?.toLowerCase();
  const packageGrams = quantity && quantityUnit === "g" ? quantity : undefined;
  const packageMl = quantity && quantityUnit === "ml" ? quantity : undefined;
  const packageServings = packageGrams && servingGrams ? packageGrams / servingGrams : packageMl && servingMl ? packageMl / servingMl : undefined;
  const energy = (basis: string) => number(n[`energy-kcal_${basis}`]) ?? (number(n[`energy-kj_${basis}`]) !== undefined ? number(n[`energy-kj_${basis}`])! / 4.184 : number(n[`energy_${basis}`]) !== undefined ? number(n[`energy_${basis}`])! / 4.184 : undefined);
  const liquid = !servingGrams && (/\bml\b/i.test(servingSize || "") || raw.product_quantity_unit === "ml" || raw.nutrition_data_per === "100ml");
  const basis = energy("serving") !== undefined ? "serving" : liquid ? "100ml" : "100g";
  const suffix = basis === "100ml" ? "100g" : basis;
  const macro = (name: string) => number(n[`${name}_${suffix}`]) ?? (basis === "serving" && servingGrams && number(n[`${name}_100g`]) !== undefined ? number(n[`${name}_100g`])! * servingGrams / 100 : undefined);
  return { barcode, name: text(raw.product_name) || "Unnamed product", brand: text(raw.brands), image: photo(raw.image_front_small_url), imageLarge: photo(raw.image_front_url), servingSize, servingGrams, servingMl, packageGrams, packageMl, packageServings, basis, calories: energy(suffix), protein: macro("proteins"), carbs: macro("carbohydrates"), fat: macro("fat") };
}
export function portionFactor(product: Product, amount: number, unit: "serving" | "grams" | "ml") {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a positive amount.");
  if (unit === "ml") {
    if (product.basis === "100ml") return amount / 100;
    if (product.basis === "serving" && product.servingMl) return amount / product.servingMl;
    throw new Error("Volume nutrition is unavailable.");
  }
  if (unit === "grams") {
    if (product.basis === "100g") return amount / 100;
    if (product.servingGrams) return amount / product.servingGrams;
  } else {
    if (product.basis === "serving") return amount;
    if (product.basis === "100g" && product.servingGrams) return amount * product.servingGrams / 100;
    if (product.basis === "100ml" && product.servingMl) return amount * product.servingMl / 100;
  }
  throw new Error("The serving weight is unknown. Use the nutrition label’s unit.");
}
export function productToFood(product: Product, id: string, purchase?: { price: number; amount: number; unit: "serving" | "grams" | "ml" }): SavedFood {
  if (purchase && (!Number.isFinite(purchase.price) || purchase.price < 0)) throw new Error("Enter a valid package price.");
  const packageQuantity = purchase ? portionFactor(product, purchase.amount, purchase.unit) : product.basis === "100g" && product.packageGrams ? product.packageGrams / 100 : product.basis === "100ml" && product.packageMl ? product.packageMl / 100 : product.basis === "serving" ? product.packageServings ?? 1 : 1;
  if (product.calories === undefined) throw new Error("Calories are missing. Enter nutrition manually.");
  return { id, name: product.name, brand: product.brand, barcode: product.barcode, image: product.image || product.imageLarge, imageLarge: product.imageLarge, servingGrams: product.basis === "100g" ? 100 : product.servingGrams, nutritionBasis: product.basis, caloriesPerServing: product.calories, servingDescription: product.basis === "100g" ? "100 g" : product.basis === "100ml" ? "100 ml" : product.servingSize || "1 serving", protein: product.protein, carbs: product.carbs, fat: product.fat, packageQuantity, price: purchase?.price ?? 0, favorite: false, createdAt: new Date().toISOString() };
}

export function packageAmountForUnit(product: Product, unit: "serving" | "grams" | "ml") {
  return unit === "serving" ? product.packageServings : unit === "grams" ? product.packageGrams : product.packageMl;
}
