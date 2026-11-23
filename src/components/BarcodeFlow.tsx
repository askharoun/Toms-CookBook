"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { decodeEanFrame } from "@/lib/eanDecoder";
import { useApp } from "@/context/AppContext";
import { foodToLog, makeId } from "@/lib/utils";
import { portionFactor, productToFood, type Product } from "@/lib/barcode";
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
        let previousCode = "", matches = 0;
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
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
            const decoded = detector ? null : decodeEanFrame(preview, canvas);
            const results = detector ? await detector.detect(preview) : decoded ? [{ rawValue: decoded }] : [];
            const result = results.find((item) => /^\d{8,14}$/.test(item.rawValue));
            matches = result && result.rawValue === previousCode ? matches + 1 : 1;
            previousCode = result?.rawValue || "";
            if (result && matches >= 2 && !disposed && !accepted) {
              accepted = true; stop(); onCode(result.rawValue); return;
            }
          } catch { /* A blurred frame is retried without starting another lookup. */ }
          if (!disposed && !accepted) timer = setTimeout(() => { void scan(); }, 200);
        };
        void scan();
      } catch { if (!disposed) setError("Camera unavailable or permission denied. Allow camera access or type the barcode below."); stop(); }
    };
    void start();
    const visibility = () => { if (document.hidden) { disposed = true; stop(); setError("Camera paused. Close and reopen Scan barcode to resume, or type below."); } };
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [onCode]);
  return <div className="scanner-camera">
    <video ref={video} muted playsInline autoPlay onPlaying={() => setReady(true)} aria-label="Live barcode camera" />
    {!ready && !error && <div className="scanner-loading"><span className="motion-art"><Image unoptimized src="/assets/scanner.svg" alt="" width={160} height={160} /></span><p>Starting camera…</p></div>}
    {ready && !error && <><div className="scan-frame" aria-hidden="true" /><p className="absolute bottom-3 inset-x-0 text-center text-sm text-white">Center the barcode horizontally</p></>}
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
      const p: Product = payload.product; setProduct(p);
      setUnit(p.basis === "100ml" ? "ml" : p.basis === "serving" || p.servingGrams ? "serving" : "grams");
      setAmount(p.basis === "serving" || p.servingGrams ? 1 : 100);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Lookup failed. Retry or enter manually."); }
    finally { locked.current = false; if (!controller.signal.aborted) setBusy(false); }
  };
  useEffect(() => { lookupRef.current = (value) => { void lookup(value); }; });
  let factor = 0;
  if (product && amount > 0) { try { factor = portionFactor(product, amount, unit); } catch { /* Unsupported unit cannot be logged. */ } }
  const save = () => {
    if (!product || product.calories === undefined || !factor || locked.current) return;
    locked.current = true;
    const food = productToFood(product, makeId("food"));
    addFood(food); addFoodLog(foodToLog(food, date, factor)); onLogged?.(); onClose();
  };
  return <Modal open onClose={onClose} title="Scan barcode" description="Find your food, check the label, choose your portion." footer={product && product.calories !== undefined ? <button className="primary-button w-full" disabled={!factor} onClick={save}>Log food · {Math.round(product.calories * factor)} cal</button> : undefined}>
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
          <div className="grid grid-cols-2 gap-3"><label><span className="label">Amount eaten</span><input className="input" type="number" min="0.01" step="any" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></label><label><span className="label">Unit</span><select className="input" value={unit} onChange={(e) => { setUnit(e.target.value as typeof unit); setAmount(e.target.value === "ml" ? 100 : e.target.value === "grams" ? product.servingGrams || 100 : 1); }}>{(product.basis === "serving" || product.servingGrams) && <option value="serving">Servings</option>}{(product.basis === "100g" || product.servingGrams) && <option value="grams">Grams</option>}{product.basis === "100ml" && <option value="ml">Milliliters</option>}</select></label></div>
          <p className="heading text-3xl">{Math.round(product.calories * factor)} <span className="text-base">calories</span></p>
          <div className="flex flex-wrap gap-4 text-sm">{([['Protein', product.protein], ['Carbs', product.carbs], ['Fat', product.fat]] as const).map(([label, value]) => <span key={label}>{label}: {value === undefined ? "unavailable" : `${Math.round(value * factor * 10) / 10} g`}</span>)}</div>
        </>}
        <a className="muted text-sm underline" href={`https://world.openfoodfacts.org/product/${product.barcode}`} target="_blank" rel="noreferrer">Product data: Open Food Facts</a>
      </div>}
      <button className="secondary-button w-full" onClick={onManual}>Finish with manual entry</button>
    </div>
  </Modal>;
}
