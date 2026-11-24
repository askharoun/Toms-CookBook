"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";

export function SlideToFinish({ label, onFinish }: { label: string; onFinish: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; start: number; travel: number } | null>(null);
  const progressRef = useRef(0);
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const move = (value: number) => { progressRef.current = Math.max(0, Math.min(1, value)); setProgress(progressRef.current); };
  const finish = () => {
    if (finished.current) return;
    finished.current = true; move(1); setDone(true); setDragging(false);
    timer.current = setTimeout(() => onFinishRef.current(), 300);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return <div ref={track} className={`finish-slider ${dragging ? "is-dragging" : ""} ${done ? "is-done" : ""}`}>
    <span className="finish-slider-fill" style={{ width: `calc(${progress * 100}% + ${56 - 64 * progress}px)` }}/>
    <span className="finish-slider-label" style={{ opacity: done ? 1 : 1 - progress }}>{done ? "Finished" : "Slide to finish"}</span>
    <div className="finish-slider-thumb" role="slider" tabIndex={done ? -1 : 0} aria-label={`Finish ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={done ? "Finished" : progress >= .9 ? "Release or press Enter to finish" : "Slide right to finish"} style={{ left: `calc(${progress * 100}% + ${4 - 60 * progress}px)` }} onPointerDown={event => {
      if (finished.current || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, start: event.clientX, travel: Math.max(1, (track.current?.clientWidth || 300) - 60) }; move(0); setDragging(true);
    }} onPointerMove={event => { if (drag.current?.id === event.pointerId) move((event.clientX - drag.current.start) / drag.current.travel); }} onPointerUp={event => {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null; setDragging(false);
      if (progressRef.current >= .9) finish(); else move(0);
    }} onPointerCancel={() => { drag.current = null; setDragging(false); if (!finished.current) move(0); }} onLostPointerCapture={() => { if (drag.current) { drag.current = null; setDragging(false); move(0); } }} onKeyDown={event => {
      if (finished.current) return;
      if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "Home", "End", "Enter", " "].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowRight" || event.key === "ArrowUp") move(progressRef.current + .1);
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") move(progressRef.current - .1);
      if (event.key === "Home") move(0);
      if (event.key === "End") move(1);
      if ((event.key === "Enter" || event.key === " ") && progressRef.current >= .9) finish();
    }}>{done ? <Check size={23}/> : <ChevronRight size={25}/>}</div>
    <button type="button" className="sr-only focus:not-sr-only finish-accessible" disabled={done} onClick={finish}>Finish {label}</button>
  </div>;
}
