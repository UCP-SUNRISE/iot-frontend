"use client";

import React, { useState } from 'react';
import { useCookedThreshold } from '@/contexts/SettingsContext';

interface CookedThresholdInputProps {
  id: string;
  className?: string;
}

/** Number input for the cooked threshold. Saves on blur or Enter, so half-typed values never persist. */
export function CookedThresholdInput({ id, className = '' }: CookedThresholdInputProps) {
  const [threshold, setThreshold] = useCookedThreshold();
  const [draft, setDraft] = useState(String(threshold));
  const [syncedThreshold, setSyncedThreshold] = useState(threshold);

  // Follow changes made elsewhere (Settings page, another tab).
  if (threshold !== syncedThreshold) {
    setSyncedThreshold(threshold);
    setDraft(String(threshold));
  }

  const commit = () => {
    const value = Number(draft);
    if (Number.isFinite(value) && value > 0) setThreshold(Math.round(value));
    else setDraft(String(threshold));
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        step={50}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="text-muted-foreground">N</span>
    </span>
  );
}
