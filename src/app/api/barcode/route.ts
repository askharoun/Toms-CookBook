import { normalizeProduct } from "../../../lib/barcode";

export async function GET(request: Request) {
  const barcode = new URL(request.url).searchParams.get("code") || "";
  if (!/^\d{8,14}$/.test(barcode)) return Response.json({ error: "Enter 8–14 barcode digits, including leading zeros." }, { status: 400 });
  try {
    const fields = "product_name,brands,serving_size,serving_quantity,serving_quantity_unit,product_quantity,product_quantity_unit,nutrition_data_per,nutriments,image_front_small_url,image_front_url";
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`, {
      headers: { "User-Agent": "TomsCookBook/1.0 (personal food tracking PWA)", Accept: "application/json" },
      signal: AbortSignal.timeout(10000), cache: "no-store",
    });
    if (response.status === 404) return Response.json({ error: "No product found. Try again or enter the food manually." }, { status: 404 });
    if (!response.ok) throw new Error("Upstream unavailable");
    const payload = await response.json();
    if (payload.status !== 1 || !payload.product) return Response.json({ error: "No product found. Try again or enter the food manually." }, { status: 404 });
    return Response.json({ product: normalizeProduct(payload.product, barcode) });
  } catch {
    return Response.json({ error: "Product lookup is unavailable. Retry or finish manually." }, { status: 502 });
  }
}
