"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, FileJson, Heart, ImageIcon, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, Upload, Utensils, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { shareOrDownloadFile } from "@/lib/fileExport";
import { caloriesForEntry, costPerServing, foodToLog, formatCalories, makeId, packageCalories, safeNumber } from "@/lib/utils";
import type { FoodLogEntry, SavedFood } from "@/types";
import { ConfirmDialog, EmptyState, Modal } from "./ui";

export function FoodTab({ date, startInLibrary = false }: { date: string; startInLibrary?: boolean }) {
  const { data, addFood, updateFood, deleteFood, setFoods, addFoodLog, updateFoodLog, deleteFoodLog, notify } = useApp();
  const [view, setView] = useState<"log" | "library">(() => startInLibrary ? "library" : "log");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [foodEditor, setFoodEditor] = useState<SavedFood | "new" | null>(null);
  const [logFood, setLogFood] = useState<SavedFood | null>(null);
  const [editLog, setEditLog] = useState<FoodLogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "food" | "log"; id: string; name: string } | null>(null);
  const [showAllLog, setShowAllLog] = useState(false);
  const foodImportRef = useRef<HTMLInputElement>(null);

  const log = data.foodLog.filter((entry) => entry.date === date);
  const filteredFoods = useMemo(() => data.savedFoods
    .filter((food) => !favoritesOnly || food.favorite)
    .filter((food) => `${food.name} ${food.servingDescription} ${food.notes || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)), [data.savedFoods, favoritesOnly, search]);

  const duplicateFood = (food: SavedFood) => {
    addFood({ ...food, id: makeId("food"), name: `${food.name} copy`, favorite: false, createdAt: new Date().toISOString() });
    notify("Food duplicated.");
  };

  const toggleFavorite = (food: SavedFood) => {
    updateFood({ ...food, favorite: !food.favorite });
    notify(food.favorite ? "Removed from favorites." : "Added to favorites.");
  };

  const shareFoods = async () => {
    const payload = JSON.stringify({ app: "Tom’s CookBook", schemaVersion: 1, exportedAt: new Date().toISOString(), foods: data.savedFoods }, null, 2);
    const file = new File([payload], "toms-cookbook-foods.json", { type: "application/json" });
    try {
      const result = await shareOrDownloadFile(file, { title: "Tom’s CookBook saved foods", text: "My saved food library" });
      if (result === "shared") notify("Food library shared.");
      if (result === "downloaded") notify("Food JSON downloaded.");
    } catch {
      notify("Couldn’t export the food library.", "error");
    }
  };

  const importFoods = async (file?: File) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as { foods?: SavedFood[] } | SavedFood[];
      const imported = Array.isArray(payload) ? payload : payload.foods;
      if (!Array.isArray(imported) || !imported.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && Number(item.caloriesPerServing) > 0)) throw new Error("Invalid food export");
      const importedKeys = new Set(imported.flatMap((item) => [item.id, item.name.trim().toLowerCase()]));
      const localOnly = data.savedFoods.filter((item) => !importedKeys.has(item.id) && !importedKeys.has(item.name.trim().toLowerCase()));
      setFoods([...imported, ...localOnly]);
      notify(`${imported.length} saved food${imported.length === 1 ? "" : "s"} imported.`);
    } catch {
      notify("That file is not a valid Tom’s CookBook food export.", "error");
    } finally {
      if (foodImportRef.current) foodImportRef.current.value = "";
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "food") deleteFood(deleteTarget.id);
    else deleteFoodLog(deleteTarget.id);
    notify(`${deleteTarget.name} deleted.`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-violet-500/7 p-1">
          <button type="button" className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${view === "log" ? "bg-violet-500 text-white shadow" : "muted"}`} onClick={() => setView("log")}>Daily log <span className="ml-1 opacity-70">{log.length}</span></button>
          <button type="button" className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${view === "library" ? "bg-violet-500 text-white shadow" : "muted"}`} onClick={() => setView("library")}>Saved foods</button>
        </div>
        <div className="flex gap-2">
          <input ref={foodImportRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => importFoods(event.target.files?.[0])}/>
          <button type="button" className="secondary-button" onClick={() => foodImportRef.current?.click()} title="Import saved foods from JSON"><Upload size={17}/> <span className="hidden sm:inline">Import</span></button>
          <button type="button" className="secondary-button" onClick={shareFoods} title="Export saved foods as JSON"><FileJson size={17}/> <span className="hidden sm:inline">Export</span></button>
          <button type="button" className="primary-button" onClick={() => setFoodEditor("new")}><Plus size={17}/> New food</button>
        </div>
      </div>

      {view === "log" ? (
        <section className="card">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="muted text-xs font-bold uppercase tracking-[.15em]">Food diary</p><h2 className="heading mt-1 text-xl">{formatCalories(log.reduce((sum, entry) => sum + caloriesForEntry(entry), 0))} calories</h2></div>
            <button type="button" className="primary-button" onClick={() => setView("library")}><Plus size={17}/> Add food</button>
          </div>
          {log.length ? <><div className="space-y-2">{(showAllLog ? log : log.slice(0, 5)).map((entry) => (
            <div key={entry.id} className="subtle-card flex items-center gap-3 p-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-500"><Utensils size={19}/></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.name}</p><p className="muted truncate text-xs">{entry.servings} × {entry.servingDescription}</p></div>
              <p className="heading shrink-0 text-sm">{formatCalories(caloriesForEntry(entry))}</p>
              <button type="button" className="icon-button !size-9" onClick={() => setEditLog(entry)} aria-label={`Edit ${entry.name} log`}><Pencil size={15}/></button>
              <button type="button" className="icon-button !size-9 text-rose-500" onClick={() => setDeleteTarget({ kind: "log", id: entry.id, name: entry.name })} aria-label={`Delete ${entry.name} log`}><Trash2 size={15}/></button>
            </div>
          ))}</div>{log.length > 5 && <button type="button" className="secondary-button mt-4 w-full" onClick={() => setShowAllLog((value) => !value)}>{showAllLog ? "Show fewer entries" : `Show all ${log.length} entries`}</button>}</> : <EmptyState icon={<Utensils/>} title="Nothing logged yet" text="Choose from your saved foods, then enter the servings you ate." action={<button className="primary-button" onClick={() => setView("library")}><Plus size={17}/> Add first food</button>} />}
        </section>
      ) : (
        <>
          <section className="card !p-3 sm:!p-4">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1"><Search className="muted absolute left-3 top-1/2 -translate-y-1/2" size={17}/><input className="input !pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved foods" aria-label="Search saved foods"/></label>
              <button type="button" className={`secondary-button shrink-0 ${favoritesOnly ? "!border-violet-500 !bg-violet-500/10 !text-violet-500" : ""}`} onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly}><Star size={17} fill={favoritesOnly ? "currentColor" : "none"}/><span className="hidden sm:inline">Favorites</span></button>
            </div>
          </section>
          {filteredFoods.length ? <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{filteredFoods.map((food) => (
            <FoodCard key={food.id} food={food} onLog={() => setLogFood(food)} onEdit={() => setFoodEditor(food)} onDelete={() => setDeleteTarget({ kind: "food", id: food.id, name: food.name })} onDuplicate={() => duplicateFood(food)} onFavorite={() => toggleFavorite(food)}/>
          ))}</section> : <EmptyState icon={<Search/>} title="No foods found" text="Try another search or create a new reusable food item." action={<button className="primary-button" onClick={() => setFoodEditor("new")}><Plus size={17}/> New food</button>}/>}
        </>
      )}

      <FoodEditor key={foodEditor === "new" ? "new" : foodEditor?.id || "closed"} open={foodEditor !== null} food={foodEditor === "new" ? null : foodEditor} onClose={() => setFoodEditor(null)} onSave={(food) => {
        if (foodEditor === "new") addFood(food); else updateFood(food);
        notify(foodEditor === "new" ? "Food saved to your library." : "Food updated.");
        setFoodEditor(null);
      }}/>
      <LogFoodModal key={logFood?.id || "closed"} food={logFood} date={date} onClose={() => setLogFood(null)} onSave={(servings) => {
        if (!logFood) return;
        addFoodLog(foodToLog(logFood, date, servings));
        notify(`${logFood.name} added to the daily log.`);
        setLogFood(null);
        setView("log");
      }}/>
      <EditLogModal key={editLog?.id || "closed"} entry={editLog} onClose={() => setEditLog(null)} onSave={(entry) => { updateFoodLog(entry); notify("Serving amount updated."); setEditLog(null); }}/>
      <ConfirmDialog open={deleteTarget !== null} title={`Delete ${deleteTarget?.name || "item"}?`} description={deleteTarget?.kind === "food" ? "Past diary entries will stay in your history, but this saved food will be removed." : "This will remove the entry from the daily diary and update your totals."} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>
    </div>
  );
}

function FoodCard({ food, onLog, onEdit, onDelete, onDuplicate, onFavorite }: { food: SavedFood; onLog: () => void; onEdit: () => void; onDelete: () => void; onDuplicate: () => void; onFavorite: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <article className={`card group relative overflow-visible !p-0 ${menu ? "z-40" : "z-0"}`}>
      <div className="relative h-36 bg-violet-500/8">
        <div className="absolute inset-0 overflow-hidden rounded-t-[1.6rem]">{food.image ? <Image src={food.image} alt="" fill sizes="(min-width: 1536px) 30vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-cover transition duration-500 group-hover:scale-105"/> : <div className="grid h-full place-items-center text-violet-300"><ImageIcon size={36}/></div>}</div>
        <button type="button" onClick={onFavorite} className="absolute left-3 top-3 grid size-9 place-items-center rounded-xl bg-white/90 text-violet-600 shadow backdrop-blur" aria-label={food.favorite ? `Unfavorite ${food.name}` : `Favorite ${food.name}`}><Heart size={17} fill={food.favorite ? "currentColor" : "none"}/></button>
        <button type="button" onClick={() => setMenu((value) => !value)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-white/90 text-ink shadow backdrop-blur" aria-label={`More options for ${food.name}`}><MoreHorizontal size={18}/></button>
        {menu && <div className="absolute right-3 top-14 z-[70] w-40 rounded-xl border bg-white p-1.5 text-ink shadow-2xl">
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-violet-50" onClick={() => { onEdit(); setMenu(false); }}><Pencil size={14}/> Edit</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:bg-violet-50" onClick={() => { onDuplicate(); setMenu(false); }}><Copy size={14}/> Duplicate</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={() => { onDelete(); setMenu(false); }}><Trash2 size={14}/> Delete</button>
        </div>}
      </div>
      <div className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><h3 className="heading truncate text-lg">{food.name}</h3><p className="muted mt-0.5 truncate text-xs">{food.servingDescription}</p></div><strong className="shrink-0 text-sm text-violet-500">{formatCalories(food.caloriesPerServing)} cal</strong></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><FoodStat value={formatCalories(packageCalories(food))} label="package cal"/><FoodStat value={`$${costPerServing(food).toFixed(2)}`} label="per serving"/><FoodStat value={`${food.packageQuantity}`} label="servings"/></div>
        <div className="mt-4 flex gap-2"><button type="button" className="primary-button flex-1" onClick={onLog}><Plus size={17}/> Log food</button>{food.purchaseLink && <a className="icon-button" href={food.purchaseLink} target="_blank" rel="noreferrer" aria-label={`Open purchase link for ${food.name}`}><ExternalLink size={17}/></a>}</div>
      </div>
    </article>
  );
}

function FoodStat({ value, label }: { value: string; label: string }) { return <div className="subtle-card p-2"><p className="heading truncate text-xs">{value}</p><p className="muted mt-0.5 truncate text-[9px]">{label}</p></div>; }

function FoodEditor({ open, food, onClose, onSave }: { open: boolean; food: SavedFood | null; onClose: () => void; onSave: (food: SavedFood) => void }) {
  const { notify } = useApp();
  const [calories, setCalories] = useState(food?.caloriesPerServing || 0);
  const [quantity, setQuantity] = useState(food?.packageQuantity || 1);
  const [price, setPrice] = useState(food?.price || 0);
  const [image, setImage] = useState(food?.image || "");
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > 700_000) { notify("Choose an image smaller than 700 KB for local storage.", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => notify("Couldn’t read that image.", "error");
    reader.readAsDataURL(file);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const servingDescription = String(form.get("servingDescription") || "").trim();
    if (!name || !servingDescription || calories <= 0 || quantity <= 0 || price < 0) { notify("Complete the required food details with valid values.", "error"); return; }
    onSave({
      id: food?.id || makeId("food"), name, image: image.trim() || undefined,
      purchaseLink: String(form.get("purchaseLink") || "").trim() || undefined,
      caloriesPerServing: calories, servingDescription, packageQuantity: quantity, price,
      protein: optionalNumber(form.get("protein")), carbs: optionalNumber(form.get("carbs")), fat: optionalNumber(form.get("fat")),
      notes: String(form.get("notes") || "").trim() || undefined,
      favorite: food?.favorite || false, createdAt: food?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={food ? "Edit saved food" : "Create saved food"} description="Save it once, then log it on any day in a few taps." width="max-w-2xl" footer={<div className="flex gap-3"><button type="button" className="secondary-button flex-1" onClick={onClose}>Cancel</button><button type="submit" form="food-editor-form" className="primary-button flex-1">Save food</button></div>}>
      <form id="food-editor-form" onSubmit={submit} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Food name *</span><input className="input" name="name" required defaultValue={food?.name} placeholder="Large eggs" autoFocus/></label>
          <label><span className="label">Serving description *</span><input className="input" name="servingDescription" required defaultValue={food?.servingDescription} placeholder="1 egg"/></label>
          <label><span className="label">Calories per serving *</span><input className="input" name="calories" type="number" min="1" step="1" required value={calories || ""} onChange={(event) => setCalories(Number(event.target.value))} placeholder="80"/></label>
          <label><span className="label">Servings in package *</span><input className="input" name="quantity" type="number" min="0.01" step="0.01" required value={quantity || ""} onChange={(event) => setQuantity(Number(event.target.value))} placeholder="36"/></label>
          <label><span className="label">Package price ($) *</span><input className="input" name="price" type="number" min="0" step="0.01" required value={price} onChange={(event) => setPrice(Number(event.target.value))} placeholder="4.94"/></label>
          <label><span className="label">Purchase link</span><input className="input" name="purchaseLink" type="url" defaultValue={food?.purchaseLink} placeholder="https://…"/></label>
        </div>
        <div>
          <span className="label">Product image</span>
          <div className="flex gap-3"><label className="min-w-0 flex-1"><span className="sr-only">Image URL</span><input className="input" value={image.startsWith("data:") ? "Uploaded image" : image} onChange={(event) => setImage(event.target.value)} placeholder="Paste an image URL" disabled={image.startsWith("data:")}/></label><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])}/><button type="button" className="secondary-button shrink-0" onClick={() => fileRef.current?.click()}><Upload size={17}/> Upload</button>{image && <button type="button" className="icon-button shrink-0" onClick={() => setImage("")} aria-label="Remove image"><X size={17}/></button>}</div>
        </div>
        <div className="rounded-2xl bg-violet-500/7 p-4"><p className="mb-3 text-xs font-bold text-violet-600 dark:text-violet-300">Optional nutrition per serving</p><div className="grid grid-cols-3 gap-3"><label><span className="label">Protein (g)</span><input className="input" name="protein" type="number" min="0" step="0.1" defaultValue={food?.protein}/></label><label><span className="label">Carbs (g)</span><input className="input" name="carbs" type="number" min="0" step="0.1" defaultValue={food?.carbs}/></label><label><span className="label">Fat (g)</span><input className="input" name="fat" type="number" min="0" step="0.1" defaultValue={food?.fat}/></label></div></div>
        <label><span className="label">Notes</span><textarea className="input min-h-20 resize-y" name="notes" defaultValue={food?.notes} placeholder="Brand, flavor, preparation…"/></label>
        <div className="grid grid-cols-2 gap-3 rounded-2xl border p-4" style={{ borderColor: "rgb(var(--line))" }}><div><span className="muted text-xs">Total package calories</span><p className="heading text-xl">{formatCalories(calories * quantity)}</p></div><div><span className="muted text-xs">Cost per serving</span><p className="heading text-xl">${quantity ? (price / quantity).toFixed(2) : "0.00"}</p></div></div>
      </form>
    </Modal>
  );
}

function optionalNumber(value: FormDataEntryValue | null) { if (value === null || String(value).trim() === "") return undefined; return safeNumber(value); }

function LogFoodModal({ food, date, onClose, onSave }: { food: SavedFood | null; date: string; onClose: () => void; onSave: (servings: number) => void }) {
  const [servings, setServings] = useState(1);
  return <Modal open={food !== null} onClose={onClose} title={`Log ${food?.name || "food"}`} description={`How many ${food?.servingDescription || "servings"} did you eat?`} width="max-w-sm" footer={<button type="submit" form="log-food-form" className="primary-button w-full" disabled={!servings || servings <= 0}><Plus size={17}/> Add to log</button>}><form id="log-food-form" onSubmit={(event) => { event.preventDefault(); if (servings > 0) onSave(servings); }} className="space-y-4"><label><span className="label">Servings</span><input className="input text-lg" type="number" min="0.01" max="100" step="0.01" value={servings} onChange={(event) => setServings(Number(event.target.value))} required autoFocus/></label><div className="rounded-2xl bg-violet-500/7 p-4 text-center"><span className="muted text-xs">Adds to {date}</span><p className="heading mt-1 break-words text-2xl">{formatCalories((food?.caloriesPerServing || 0) * servings)} calories</p></div></form></Modal>;
}

function EditLogModal({ entry, onClose, onSave }: { entry: FoodLogEntry | null; onClose: () => void; onSave: (entry: FoodLogEntry) => void }) {
  const [servings, setServings] = useState(entry?.servings || 1);
  return <Modal open={entry !== null} onClose={onClose} title={`Edit ${entry?.name || "entry"}`} width="max-w-sm" footer={<button type="submit" form="edit-log-form" className="primary-button w-full">Update entry</button>}><form id="edit-log-form" onSubmit={(event) => { event.preventDefault(); if (entry && servings > 0) onSave({ ...entry, servings }); }} className="space-y-4"><label><span className="label">Servings</span><input className="input" type="number" min="0.01" max="100" step="0.01" value={servings} onChange={(event) => setServings(Number(event.target.value))} required autoFocus/></label><p className="heading break-words rounded-2xl bg-violet-500/7 p-4 text-center text-xl">{formatCalories((entry?.caloriesPerServing || 0) * servings)} calories</p></form></Modal>;
}
