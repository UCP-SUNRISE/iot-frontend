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
import { Switch } from "@/components/ui/switch";
import { ModelCandidate, TrainOptions, TrainingRun } from "@/types/models";
import { TrainingModel } from "@/types/session";
import { MODEL_TITLES, formatDuration } from "./format";

interface TrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: TrainingModel;
  candidates: ModelCandidate[];
  eligibleSessions: number;
  includeBaseline: boolean;
  /** Most recent untuned run, used for the time estimate. */
  referenceRun?: TrainingRun;
  isStarting: boolean;
  onStart: (options: TrainOptions) => Promise<boolean>;
}

/**
 * Chooses what a training run will do before it starts: which algorithms of the library
 * are trained (all by default) and whether their hyperparameters are tuned. The system
 * then validates and ranks them and recommends the best; activation stays manual.
 */
export function TrainDialog(props: TrainDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Mounted only while open, so every opening starts from the defaults */}
        {props.open && <TrainForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function summariseDefaults(candidate: ModelCandidate): string {
  // The last pipeline step is the estimator; earlier steps are preprocessing
  const estimator = candidate.model.steps[candidate.model.steps.length - 1];
  const grid = Object.keys(candidate.tuning_grid).map(key => key.split("__").pop() as string);
  const shown = grid
    .filter(key => key in estimator.hyperparameters)
    .map(key => `${key}=${JSON.stringify(estimator.hyperparameters[key])}`);
  return shown.join(", ");
}

function gridSize(candidate: ModelCandidate): number {
  return Object.values(candidate.tuning_grid).reduce((n, values) => n * values.length, 1);
}

function TrainForm({ model, candidates, eligibleSessions, includeBaseline, referenceRun, isStarting, onStart, onOpenChange }: TrainDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map(c => c.name)));
  const [tune, setTune] = useState(false);
  const [label, setLabel] = useState("");

  const toggle = (name: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const allSelected = selected.size === candidates.length;
  const canStart = selected.size > 0 && !isStarting && candidates.length > 0;

  // Scale the last untuned run by how many algorithms are selected now vs then
  const referenceCount = referenceRun ? Object.keys(referenceRun.metrics).length : 0;
  const estimate = referenceRun?.duration_seconds && referenceCount > 0
    ? referenceRun.duration_seconds * (selected.size / referenceCount)
    : null;

  const handleStart = async () => {
    const started = await onStart({
      candidates: allSelected ? undefined : candidates.filter(c => selected.has(c.name)).map(c => c.name),
      tune,
      label: label.trim() || undefined,
    });
    if (started) onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Train {MODEL_TITLES[model].toLowerCase()} model</DialogTitle>
        <DialogDescription>
          The selected algorithms are trained and validated on experiments they never saw, then ranked.
          The best one is recommended; nothing is activated automatically.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Algorithms</h3>
            <button
              type="button"
              className="text-xs text-primary hover:underline underline-offset-4"
              onClick={() => setSelected(allSelected ? new Set() : new Set(candidates.map(c => c.name)))}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading the model library…</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {candidates.map(candidate => (
                <li key={candidate.name}>
                  <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      checked={selected.has(candidate.name)}
                      onChange={() => toggle(candidate.name)}
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{candidate.name}</span>
                      <span className="block text-xs text-muted-foreground">{candidate.description}</span>
                      <span className="block text-xs text-muted-foreground font-mono">
                        {tune
                          ? `tuned over ${gridSize(candidate)} combinations`
                          : summariseDefaults(candidate)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Tune hyperparameters (slow)</span>
            <span className="block text-xs text-muted-foreground">
              Grid search inside every validation fold (nested validation), so scores stay unbiased.
              Expect roughly 10–30× the normal duration; best started when the system is otherwise idle.
            </span>
          </span>
          <Switch checked={tune} onCheckedChange={setTune} aria-label="Tune hyperparameters" />
        </label>

        <section className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">Data:</span> {eligibleSessions} eligible session(s)
            {includeBaseline ? " + the historical datasets" : " (historical datasets excluded in Settings)"}.
          </p>
          <p>
            <span className="font-medium text-foreground">Validation:</span> leave-one-experiment-out. Each experiment is
            predicted by a model trained on all the others.
          </p>
          <p>
            <span className="font-medium text-foreground">Estimated time:</span>{" "}
            {estimate == null
              ? "unknown until a first run has finished"
              : tune
                ? `about ${formatDuration(estimate * 10)} to ${formatDuration(estimate * 30)}`
                : `about ${formatDuration(estimate)} (based on the last run)`}
            . You can cancel while it runs.
          </p>
        </section>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Label <span className="text-muted-foreground font-normal">(optional)</span></span>
          <Input
            value={label}
            maxLength={80}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. after adding the September sessions"
          />
        </label>
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleStart} disabled={!canStart}>
          {isStarting ? "Starting…" : `Train ${selected.size} algorithm${selected.size === 1 ? "" : "s"}`}
        </Button>
      </DialogFooter>
    </>
  );
}
