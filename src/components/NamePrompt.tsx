"use client";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Logo, Modal } from "./ui";

export function NamePrompt({ onDismiss }: { onDismiss: () => void }) {
  const { data, setDisplayName } = useApp();
  const [name, setName] = useState(data.profile.nameConfirmed ? data.profile.displayName : "");
  return <Modal open onClose={onDismiss} title="What should we call you?" width="max-w-sm" footer={<button type="submit" form="welcome-name" className="primary-button w-full" disabled={!name.trim()}>Continue</button>}>
    <div className="mb-5"><Logo compact /></div>
    <form id="welcome-name" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; setDisplayName(name); }}>
      <label className="block"><span className="label">Your name</span><input className="input" name="givenName" value={name} onChange={event => setName(event.target.value)} placeholder="Enter your name" autoComplete="given-name" autoCapitalize="words" maxLength={40} required enterKeyHint="done" /></label>
    </form>
  </Modal>;
}
