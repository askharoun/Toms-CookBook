"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function SaveFeedback() {
  const { confirmation } = useApp();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches); change();
    media.addEventListener("change", change); return () => media.removeEventListener("change", change);
  }, []);
  if (!confirmation) return null;
  return <div key={confirmation.id} className="save-feedback" role="status">
    {reduced ? <Check size={28} /> : <Image unoptimized src={`${confirmation.kind === "food" ? "/assets/confirm.svg" : "/assets/water.gif"}?event=${encodeURIComponent(confirmation.id)}`} width={72} height={72} alt="" />}
    <div><strong>{confirmation.kind === "food" ? "Meal logged" : `+${confirmation.amount} oz`}</strong><p className="muted text-sm">{confirmation.kind === "food" ? "Added to your diary" : "Water saved"}</p></div>
  </div>;
}
