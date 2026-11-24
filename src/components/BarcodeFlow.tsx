"use client";
import { CustomSelect } from "./CustomSelect";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { decodeEanFrame, validEan } from "@/lib/eanDecoder";
import { useApp } from "@/context/AppContext";
import { foodToLog, makeId } from "@/lib/utils";
import { packageAmountForUnit, portionFactor, productToFood, type Product } from "@/lib/barcode";
import { Modal } from "./ui";
import { FoodPhoto } from "./FoodPhoto";

function Camera({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false, accepted = false;
    let stream: MediaStream | undefined;
    let controls: { stop: () => void } | undefined;
    const stop = () => { controls?.stop(); stream?.getTracks().forEach((track) => track.stop()); };
    const start = async () => {
      try {
        type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
        const DetectorClass = (window as unknown as { BarcodeDetector?: { new(options: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> } }).BarcodeDetector;
        const supported = DetectorClass ? await DetectorClass.getSupportedFormats().catch(() => []) : [];
        const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf"].filter((format) => supported.includes(format));
        const detector = DetectorClass && formats.length ? new DetectorClass({ formats }) : null;
        const canvas = document.createElement("canvas");
        let previousCode = "", matches = 0, missedFrames = 0, lastMatchAt = 0;
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (disposed) { stop(); return; }
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[] };
        if (capabilities?.focusMode?.includes("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => undefined);
        }
        if (disposed) { stop(); return; }
        const preview = video.current!;
        preview.srcObject = stream;
        await preview.play();
        if (!disposed) setReady(true);
        if (disposed) { stop(); return; }
        let timer: ReturnType<typeof setTimeout>;
        controls = { stop: () => clearTimeout(timer) };
        const scan = async () => {
          if (disposed || accepted) return;
          try {
            let results: { rawValue: string }[] = [];
            if (detector) {
              try { results = await detector.detect(preview); } catch { /* The fallback handles unsupported camera frames. */ }
            }
            const validResult = (value: string) => validEan(value.length === 12 ? `0${value}` : value);
            let result = results.find(item => validResult(item.rawValue));
            if (!result && (!detector || ++missedFrames % 3 === 0)) {
              const decoded = decodeEanFrame(preview, canvas);
              if (decoded) result = { rawValue: decoded };
            }
            if (result) {
              const now = performance.now();
              matches = result.rawValue === previousCode && now - lastMatchAt < 1400 ? matches + 1 : 1;
              previousCode = result.rawValue; lastMatchAt = now; missedFrames = 0;
            }
            if (result && matches >= 2 && !disposed && !accepted) {
              accepted = true; stop(); onCode(result.rawValue); return;
            }
          } catch { /* A blurred frame is retried without starting another lookup. */ }
          if (!disposed && !accepted) timer = setTimeout(() => { void scan(); }, 120);
        };
        timer = setTimeout(() => { void scan(); }, 650);
      } catch { if (!disposed) setError("Camera unavailable or permission denied. Allow camera access or type the barcode below."); stop(); }
    };
    void start();
    const visibility = () => { if (document.hidden) { disposed = true; stop(); setError("Camera paused. Close and reopen Scan barcode to resume, or type below."); } };
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [onCode]);
  return <div className="scanner-camera">
    <video ref={video} muted playsInline autoPlay aria-label="Live barcode camera" />
    {!ready && !error && <div className="scanner-loading"><span className="motion-art"><Image unoptimized src="/assets/scanner.svg" alt="" width={160} height={160} /></span><p>Starting camera…</p></div>}
    {ready && !error && <><div className="scan-frame" aria-hidden="true" /><p className="help-copy absolute bottom-3 inset-x-0 text-center text-sm text-white">Center the barcode horizontally</p></>}
    {error && <p className="scanner-loading" role="status">{error}</p>}
  </div>;
}

export function BarcodeFlow({ date, onClose, onManual, onLogged, initialCamera = true }: { date: string; onClose: () => void; onManual: () => void; onLogged?: () => void; initialCamera?: boolean }) {
  const { addFood, addFoodLog } = useApp();
  const [camera, setCamera] = useState(initialCamera);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<"serving" | "grams" | "ml">("serving");
  const [price, setPrice] = useState("");
  const [packageAmount, setPackageAmount] = useState("");
  const pending = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const lookupRef = useRef<(value: string) => void>(() => {});
  const [onCode] = useState(() => (value: string) => lookupRef.current(value));
  const lookup = async (value: string) => {
    if (locked.current) return;
    if (!/^\d{8,14}$/.test(value)) { setError("Enter 8–14 digits, including leading zeros."); return; }
    locked.current = true; setCamera(false); setCode(value); setBusy(true); setError(""); setProduct(null);
    const controller = new AbortController(); pending.current = controller;
    try {
      const response = await fetch(`/api/barcode?code=${encodeURIComponent(value)}`, { signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const p: Product = payload.product; setProduct(p); setPrice(""); setPackageAmount("");
      const initialUnit = p.basis === "serving" || p.servingGrams || p.servingMl ? "serving" : p.basis === "100ml" ? "ml" : "grams";
      setUnit(initialUnit);
      setAmount(initialUnit === "serving" ? 1 : 100);
      setPackageAmount(String(packageAmountForUnit(p, initialUnit) ?? ""));
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Lookup failed. Retry or enter manually."); }
    finally { locked.current = false; if (!controller.signal.aborted) setBusy(false); }
  };
  useEffect(() => { lookupRef.current = (value) => { void lookup(value); }; });
  let factor = 0;
  if (product && amount > 0) { try { factor = portionFactor(product, amount, unit); } catch { /* Unsupported unit cannot be logged. */ } }
  let packageFactor = 0;
  if (product && Number(packageAmount) > 0) { try { packageFactor = portionFactor(product, Number(packageAmount), unit); } catch {} }
  const pricingValid = price === "" || (Number.isFinite(Number(price)) && Number(price) >= 0 && packageFactor > 0);
  const portionCost = price !== "" && pricingValid ? Number(price) * factor / packageFactor : undefined;
  const save = () => {
    if (!product || product.calories === undefined || !factor || !pricingValid || locked.current) return;
    locked.current = true;
    const food = productToFood(product, makeId("food"), price !== "" ? { price: Number(price), amount: Number(packageAmount), unit } : undefined);
    addFood(food); addFoodLog(foodToLog(food, date, factor)); onLogged?.(); onClose();
  };
  return <Modal open onClose={onClose} title="Scan barcode" description="Find your food, check the label, choose your portion." footer={product && product.calories !== undefined ? <button className="primary-button w-full" disabled={!factor || !pricingValid} onClick={save}>Log food · {Math.round(product.calories * factor)} cal</button> : undefined}>
    <div className="space-y-4">
      {camera && <Camera onCode={onCode} />}
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void lookup(code); }}>
        <label className="min-w-0 flex-1"><span className="label">Type barcode</span><input className="input" value={code} onFocus={() => setCamera(false)} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} inputMode="numeric" placeholder="Include leading zeros" required pattern="[0-9]{8,14}" /></label>
        <button className="secondary-button" disabled={busy}>{busy ? "Finding…" : "Look up"}</button>
      </form>
      {!camera && !busy && <button className="secondary-button" onClick={() => { setCamera(true); setError(""); }}><ScanBarcode size={18} /> Use camera</button>}
      {error && <p role="alert" className="subtle-card p-4">{error}</p>}
      {product && <div className="subtle-card space-y-4 p-4">
        <div className="flex items-center gap-4"><FoodPhoto image={product.image} imageLarge={product.imageLarge} name={product.name} className="!size-20" /><div><p className="muted text-sm">{product.brand}</p><h3 className="heading text-xl">{product.name}</h3><p className="muted text-sm">{product.servingSize || "Serving size not supplied"}</p></div></div>
        <p className="muted text-sm">Nutrition per {product.basis === "100g" ? "100 g" : product.basis === "100ml" ? "100 ml" : "serving"}: {product.calories === undefined ? "calories unavailable" : `${Math.round(product.calories)} cal`}</p>
        {product.calories === undefined ? <p role="alert">Calories are missing. Enter them from the package manually to log this food.</p> : <>
          <div className="grid grid-cols-2 gap-3"><label><span className="label">Amount eaten</span><input className="input" type="number" inputMode="decimal" min="0.01" step="any" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></label><div><span className="label">Unit</span><CustomSelect label="Portion unit" value={unit} onChange={value => { setUnit(value as typeof unit); setPackageAmount(String(packageAmountForUnit(product, value as typeof unit) ?? "")); setAmount(value === "ml" ? 100 : value === "grams" ? product.servingGrams || 100 : 1); }} options={[...(product.basis === "serving" || product.servingGrams || product.servingMl ? [{ value: "serving", label: "Servings" }] : []), ...(product.basis === "100g" || product.servingGrams ? [{ value: "grams", label: "Grams" }] : []), ...(product.basis === "100ml" || product.servingMl ? [{ value: "ml", label: "Milliliters" }] : [])]} /></div></div>
          <fieldset className="space-y-3 border-t pt-4" style={{ borderColor: "rgb(var(--line))" }}>
            <legend className="px-1 text-sm font-bold">Package cost (optional)</legend>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Whole package price ($)</span><input className="input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="4.99" value={price} onChange={e => setPrice(e.target.value)} /></label>
              <label><span className="label">Package amount ({unit === "serving" ? "servings" : unit === "grams" ? "g" : "ml"})</span><input className="input" type="number" inputMode="decimal" min="0.01" step="any" placeholder={unit === "serving" ? "8" : "500"} value={packageAmount} onChange={e => setPackageAmount(e.target.value)} /></label>
            </div>
            <p className="help-copy muted text-sm">{packageAmountForUnit(product, unit) ? "Package amount filled from product data. Check it against your label and adjust if needed." : "Package amount unavailable. Enter the total from your label."}</p>
            {!pricingValid && <p role="alert" className="text-sm">Enter a nonnegative price and a package amount greater than zero.</p>}
            {portionCost !== undefined && <p className="text-sm font-bold">${(Number(price) / Number(packageAmount)).toFixed(2)} per {unit === "serving" ? "serving" : unit === "grams" ? "g" : "ml"} / ${portionCost.toFixed(2)} for this portion</p>}
          </fieldset>
          <p className="heading text-3xl">{Math.round(product.calories * factor)} <span className="text-base">calories</span></p>
          <div className="flex flex-wrap gap-4 text-sm">{([['Protein', product.protein], ['Carbs', product.carbs], ['Fat', product.fat]] as const).map(([label, value]) => <span key={label}>{label}: {value === undefined ? "unavailable" : `${Math.round(value * factor * 10) / 10} g`}</span>)}</div>
        </>}
        <a className="muted text-sm underline" href={`https://world.openfoodfacts.org/product/${product.barcode}`} target="_blank" rel="noreferrer">Product data: Open Food Facts</a>
      </div>}
      <button className="secondary-button w-full" onClick={onManual}>Finish with manual entry</button>
    </div>
  </Modal>;
}
