"use client";
import { useState } from "react";
import { Plus, ScanBarcode, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { foodToLog } from "@/lib/utils";
import type { SavedFood } from "@/types";
import { BarcodeFlow } from "./BarcodeFlow";
import { FoodPhoto } from "./FoodPhoto";
import { LogFoodModal } from "./FoodTab";

export function DailyFoodActions({ date, onManual }: { date: string; onManual: () => void }) {
  const { data, addFoodLog } = useApp();
  const [scanner, setScanner] = useState<"camera" | "type" | null>(null);
  const [food, setFood] = useState<SavedFood | null>(null);
  const [favorites, setFavorites] = useState(false);
  const recentIds = [...new Set(data.foodLog.map((entry) => entry.foodId))];
  const foods = favorites ? data.savedFoods.filter((item) => item.favorite) : recentIds.flatMap((id) => data.savedFoods.find((item) => item.id === id) || []);
  return <section className="card daily-food-actions">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">A little care, every day</p><h2 className="heading text-2xl">What’s on your plate?</h2></div><button className="primary-button log-food-primary" onClick={onManual}><Plus size={20}/> Log food</button></div>
    <div className="mt-4 flex flex-wrap gap-2"><button className="secondary-button" onClick={() => setScanner("camera")}><ScanBarcode size={18}/> Scan barcode</button><button className="secondary-button" onClick={() => setScanner("type")}>Type barcode</button></div>
    <div className="mt-5 flex gap-2"><button className={`filter-tab ${!favorites ? "selected" : ""}`} aria-pressed={!favorites} onClick={() => setFavorites(false)}>Recent foods</button><button className={`filter-tab ${favorites ? "selected" : ""}`} aria-pressed={favorites} onClick={() => setFavorites(true)}><Star size={16}/> Favorites</button></div>
    <div className="recent-foods">{foods.slice(0, 6).map((item) => <button key={item.id} className="recent-food subtle-card" onClick={() => setFood(item)}><FoodPhoto image={item.image} imageLarge={item.imageLarge} name="" /><span><strong>{item.name}</strong><span className="muted block text-sm">{Math.round(item.caloriesPerServing)} cal · {item.servingDescription}</span></span><Plus size={18} className="shrink-0"/></button>)}</div>
    {!foods.length && <p className="muted mt-3 text-sm">{favorites ? "Star a saved food to keep it here." : "Your recently logged foods will be ready here next time."}</p>}
    {scanner && <BarcodeFlow date={date} initialCamera={scanner === "camera"} onClose={() => setScanner(null)} onManual={() => { setScanner(null); onManual(); }} />}
    <LogFoodModal key={food?.id || "closed"} food={food} date={date} onClose={() => setFood(null)} onSave={(servings) => { if (food) addFoodLog(foodToLog(food, date, servings)); setFood(null); }}/>
  </section>;
}
