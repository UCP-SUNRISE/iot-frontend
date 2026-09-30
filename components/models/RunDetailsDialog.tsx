"use client";

import { ReactNode, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportTrainingRun } from "@/lib/exportModelRun";
import { TrainingRun, TrainingRunDetail } from "@/types/models";
import { RunCharts } from "./RunCharts";
import { formatDuration, formatRunDate, shortExperimentId } from "./format";

interface RunDetailsDialogProps {
  /** Summary of the run to open; null closes the dialog. */
  run: TrainingRun | null;
  errorUnit: string;
  onOpenChange: (open: boolean) => void;
  loadRun: (runId: string, predictions: boolean) => Promise<TrainingRunDetail>;
  annotate: (runId: string, label: string, notes: string) => Promise<boolean>;
}

/** The complete record of one training run: data, pipeline, validation results and how the winner was chosen. */
export function RunDetailsDialog({ run, errorUnit, onOpenChange, loadRun, annotate }: RunDetailsDialogProps) {
  return (
    <Dialog open={!!run} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Remount per run so loading state and the notes draft start fresh */}
        {run && <RunDetails key={run.run_id} summary={run} errorUnit={errorUnit} loadRun={loadRun} annotate={annotate} />}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function RunDetails({ summary, errorUnit, loadRun, annotate }: {
  summary: TrainingRun;
  errorUnit: string;
  loadRun: RunDetailsDialogProps["loadRun"];
  annotate: RunDetailsDialogProps["annotate"];
}) {
  const [detail, setDetail] = useState<TrainingRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(summary.label ?? "");
  const [notes, setNotes] = useState(summary.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRun(summary.run_id, true)
      .then(run => { if (!cancelled) setDetail(run); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the run"); });
    return () => { cancelled = true; };
  }, [loadRun, summary.run_id]);

  const notesDirty = label !== (summary.label ?? "") || notes !== (summary.notes ?? "");
  const saveNotes = async () => {
    setIsSaving(true);
    await annotate(summary.run_id, label, notes);
    setIsSaving(false);
  };

  const methods = detail?.methods;
  const steps: { title: string; items: Record<string, string> }[] = methods ? [
    { title: "Data preparation", items: methods.preprocessing },
    { title: "Validation", items: methods.validation },
    { title: "Hyperparameters", items: { [methods.tuning.enabled ? "Tuned" : "Fixed"]: methods.tuning.method } },
    { title: "Model selection", items: { Rule: methods.selection.rule } },
  ] : [];

  return (
    <>
      <DialogHeader className="p-6 pb-4 border-b bg-muted/30 flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <DialogTitle className="text-xl font-bold">
            Training run <span className="font-mono text-primary">{summary.run_id}</span>
          </DialogTitle>
          <DialogDescription>
            {formatRunDate(summary.created_at)}
            {summary.requested_by ? ` · started by ${summary.requested_by}` : ""}
            {summary.duration_seconds != null ? ` · took ${formatDuration(summary.duration_seconds)}` : ""}
          </DialogDescription>
        </div>
        <Button size="sm" className="mr-8" disabled={!detail} onClick={() => detail && exportTrainingRun({ ...detail, label, notes }, errorUnit)}>
          <Download className="h-4 w-4" />
          Export XLSX
        </Button>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto p-6 space-y-8">
        <Section title="Overview">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Fact label="Recommended model">{summary.recommended_model}</Fact>
            <Fact label="Models trained">{Object.keys(summary.metrics).length}</Fact>
            <Fact label="Hyperparameters">{summary.tuned ? "Tuned (nested validation)" : "Fixed defaults"}</Fact>
            <Fact label="Data">
              {summary.data.experiments} experiments · {summary.data.rows} rows
            </Fact>
            <Fact label="Sessions">{summary.data.session_ids.length}</Fact>
            <Fact label="Historical experiments">{summary.data.include_baseline ? summary.data.baseline_experiments : "excluded"}</Fact>
            {summary.chain && (
              <Fact label="Chained evaluation">
                {summary.chain.available
                  ? `${summary.chain.batches} batches via ${summary.chain.kinetics_source?.model_name}`
                  : "not available"}
              </Fact>
            )}
          </dl>
          {summary.data.skipped_baseline_batches && summary.data.skipped_baseline_batches.length > 0 && (
            <p className="text-xs text-amber-500/90">
              Historical batches rejected by data validation: {summary.data.skipped_baseline_batches.join(", ")}
            </p>
          )}
        </Section>

        <Section title="Label and notes">
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-start">
            <Input value={label} maxLength={80} onChange={e => setLabel(e.target.value)} placeholder="Label" aria-label="Run label" />
            <textarea
              value={notes}
              maxLength={2000}
              rows={2}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (e.g. why this run was made, what changed in the data)"
              aria-label="Run notes"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <Button variant="outline" disabled={!notesDirty || isSaving} onClick={saveNotes}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Section>

        {error && <p className="text-sm text-destructive">Could not load the full record: {error}</p>}
        {!detail && !error && <p className="text-sm text-muted-foreground">Loading the full record…</p>}

        {detail && (
          <>
            {methods ? (
              <>
                <Section title="How this run was produced">
                  <ol className="space-y-4">
                    {steps.map((step, i) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{step.title}</div>
                          <dl className="space-y-1">
                            {Object.entries(step.items).map(([key, text]) => (
                              <div key={key} className="text-sm">
                                <dt className="inline text-muted-foreground capitalize">{key.replace(/_/g, " ")}: </dt>
                                <dd className="inline">{text}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    Software: {Object.entries(methods.software).map(([name, v]) => `${name} ${v ?? "?"}`).join(", ")} · random seed {methods.random_seed}
                  </p>
                </Section>

                <Section title="Ranking">
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">R²</TableHead>
                          {methods.selection.ranking.some(r => r.noise_r2 != null) && <TableHead className="text-right">R² w/ noise</TableHead>}
                          <TableHead className="text-right">Overfit gap</TableHead>
                          {methods.selection.ranking.some(r => r.max_prediction != null) && <TableHead className="text-right">Max prediction</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {methods.selection.ranking.map(row => (
                          <TableRow key={row.model}>
                            <TableCell className="tabular-nums">{row.rank}</TableCell>
                            <TableCell>
                              <span className="font-medium">{row.model}</span>
                              {row.selected && <Badge variant="outline" className="ml-2">Recommended</Badge>}
                              {row.physics_ok === false && <Badge variant="outline" className="ml-2 text-red-400 border-red-400/40">Disqualified</Badge>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.composite_score.toFixed(3)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.cv_r2.toFixed(3)}</TableCell>
                            {methods.selection.ranking.some(r => r.noise_r2 != null) && (
                              <TableCell className="text-right tabular-nums">{row.noise_r2?.toFixed(3) ?? "—"}</TableCell>
                            )}
                            <TableCell className="text-right tabular-nums">{row.overfit_gap.toFixed(3)}</TableCell>
                            {methods.selection.ranking.some(r => r.max_prediction != null) && (
                              <TableCell className="text-right tabular-nums">{row.max_prediction?.toFixed(1) ?? "—"} °C</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This run was trained before the full methods record was introduced, so only its metrics are available. Retrain to get the complete record.
              </p>
            )}

            <Section title="Validation results">
              <RunCharts run={detail} errorUnit={errorUnit} />
            </Section>

            {detail.chain?.available && (
              <Section title="Chained evaluation">
                <p className="text-sm text-muted-foreground">
                  These batches were also predicted from the kinetics model&apos;s out-of-fold water curve
                  ({detail.chain.kinetics_source?.model_name}, run <span className="font-mono">{detail.chain.kinetics_source?.run_id}</span>).
                </p>
                <ul className="grid gap-1 text-xs font-mono md:grid-cols-2">
                  {detail.chain.matches.map(match => (
                    <li key={match.batch}>
                      {shortExperimentId(match.batch)} <span className="text-muted-foreground">↔ {shortExperimentId(match.kinetics_experiment)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}
