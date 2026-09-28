"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionRow, SessionTrainingChanges } from "@/types/session";
import { parseDbTimestamp } from "@/lib/time";

interface HardnessDialogProps {
  session: SessionRow | null;
  unit: string;
  onOpenChange: (open: boolean) => void;
  onSave: (sessionId: string, changes: SessionTrainingChanges) => void;
}

/**
 * Records the lab-measured final hardness of a finished session.
 * The value usually arrives days after cooking (TPA measurement), so it is
 * entered from History rather than when the session stops.
 */
export function HardnessDialog({ session, unit, onOpenChange, onSave }: HardnessDialogProps) {
  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remount per session so the form starts from that session's stored values */}
        {session && <HardnessForm key={session.session_id} session={session} unit={unit} onSave={onSave} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function HardnessForm({ session, unit, onSave, onClose }: {
  session: SessionRow;
  unit: string;
  onSave: HardnessDialogProps["onSave"];
  onClose: () => void;
}) {
  const [value, setValue] = useState(session.final_hardness?.toString() ?? "");
  const [notes, setNotes] = useState(session.hardness_notes ?? "");

  const parsed = Number(value);
  const isValid = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(session.session_id, { final_hardness: parsed, hardness_notes: notes.trim() || null });
    onClose();
  };

  const handleClear = () => {
    onSave(session.session_id, { final_hardness: null, hardness_notes: null });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Final hardness</DialogTitle>
        <DialogDescription>
          Lab-measured TPA hardness for <span className="font-mono">{session.session_id}</span>
          {session.experiment_name ? ` (${session.experiment_name})` : ""}. Required before the session can be used for training.
        </DialogDescription>
      </DialogHeader>

      <form
        className="space-y-4"
        onSubmit={e => { e.preventDefault(); handleSave(); }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Hardness</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              aria-invalid={value !== "" && !isValid}
              className="tabular-nums"
            />
            <span className="text-sm text-muted-foreground w-8">{unit}</span>
          </div>
          {value !== "" && !isValid && (
            <span className="text-xs text-destructive">Enter a positive number.</span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="e.g. mean of 5 TPA replicates, measured 2 days after cooking"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>

        {session.hardness_recorded_at && (
          <p className="text-xs text-muted-foreground">
            Last recorded {parseDbTimestamp(session.hardness_recorded_at)?.toLocaleString()}
            {session.hardness_recorded_by ? ` by ${session.hardness_recorded_by}` : ""}.
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {session.final_hardness != null ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={handleClear}>
              Remove value
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!isValid}>Save</Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
