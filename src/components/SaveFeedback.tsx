"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useNotificationPresence } from "./useNotificationPresence";
import { useApp } from "@/context/AppContext";

export function SaveFeedback() {
  const { confirmation } = useApp();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches); change();
    media.addEventListener("change", change); return () => media.removeEventListener("change", change);
  }, []);
  const { item, exiting } = useNotificationPresence(confirmation);
  if (!item) return null;
  return <div key={item.id} className={`save-feedback notification-motion ${exiting ? "is-exiting" : ""}`} role="status">
    {reduced ? <Check size={20} className="shrink-0 text-emerald-500" /> : item.kind === "food" ? <Image unoptimized src={`/assets/confirm.svg?event=${encodeURIComponent(item.id)}`} width={48} height={48} alt="" className="confirmation-art" /> : <span className="water-animation"><video className="water-desktop" src="/assets/water.webm" autoPlay muted playsInline loop preload="auto" aria-hidden="true" /><Image className="water-mobile" unoptimized src={`/assets/water.gif?event=${encodeURIComponent(item.id)}`} width={36} height={36} alt="" /></span>}
    <strong>{item.kind === "food" ? "Food logged" : `+${item.amount} oz logged`}</strong>
  </div>;
}
