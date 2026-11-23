"use client";
import { useState } from "react";
export function FoodPhoto({ image, imageLarge, name, className = "" }: { image?: string; imageLarge?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = [image, imageLarge, "/icons/tc-64.png"].find((url) => url && !failed.includes(url)) || "/icons/tc-64.png";
  // Native images support uploaded data URLs and remote product images without a proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={`food-photo ${className}`} style={src === "/icons/tc-64.png" ? { objectFit: "scale-down" } : undefined} onError={() => setFailed((values) => [...values, src])} />;
}
