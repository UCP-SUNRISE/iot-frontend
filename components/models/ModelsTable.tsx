"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelEntry, ModelRegistry, TrainingRun, flattenRuns } from "@/types/models";
import { TrainingModel } from "@/types/session";
import { cn } from "@/lib/utils";
import { errorUnit, formatError, formatRunDate } from "./format";

type SortKey = "created_at" | "cv_r2" | "cv_rmse" | "composite_score";

const SORTS: Record<SortKey, (e: ModelEntry) => number> = {
  created_at: e => -new Date(e.run.created_at).getTime(),
  cv_r2: e => -e.metrics.cv_r2,
  cv_rmse: e => e.metrics.cv_rmse,
  composite_score: e => -e.metrics.composite_score,
};

function SortHeader({ label, sortKey, current, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; onSort: (k: SortKey) => void; className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        className={cn("inline-flex items-center gap-1 hover:text-foreground", current === sortKey && "text-foreground")}
        onClick={() => onSort(sortKey)}
      >
        {label}<ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

export function ModelsTable({ model, registry, hardnessUnit, onActivate, onDetails, onExportRun, onExportAll, onDelete }: {
  model: TrainingModel;
  registry: ModelRegistry;
  hardnessUnit: string;
  onActivate: (entry: ModelEntry) => void;
  onDetails: (run: TrainingRun) => void;
  onExportRun: (run: TrainingRun) => void;
  onExportAll: () => void;
  onDelete: (run: TrainingRun) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const unit = errorUnit(model, hardnessUnit);
  const isKinetics = model === "kinetics";

  const entries = useMemo(() => {
    const byKey = SORTS[sortKey];
    // Within a run, keep the best candidates first
    return flattenRuns(registry.runs).sort((a, b) =>
      byKey(a) - byKey(b) || b.metrics.composite_score - a.metrics.composite_score
    );
  }, [registry.runs, sortKey]);

  const isActive = (e: ModelEntry) => registry.active?.run_id === e.run.run_id && registry.active?.model_name === e.name;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Trained models</CardTitle>
          <CardDescription>
            Every candidate from every training run. Metrics are computed on experiments each model never saw.
            {isKinetics
              ? " Models predicting above 100 °C fail the physical-limit check and are never recommended."
              : " Chained RMSE uses the kinetics model's predicted curve instead of the measured one."}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={onExportAll} disabled={entries.length === 0}>
          <Download className="h-4 w-4" />
          Export all (XLSX)
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No training runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Run" sortKey="created_at" current={sortKey} onSort={setSortKey} />
                  <TableHead>Model</TableHead>
                  <SortHeader label="R²" sortKey="cv_r2" current={sortKey} onSort={setSortKey} className="text-right" />
                  <SortHeader label={`RMSE (${unit})`} sortKey="cv_rmse" current={sortKey} onSort={setSortKey} className="text-right" />
                  <TableHead className="text-right">MAE ({unit})</TableHead>
                  {isKinetics
                    ? <TableHead className="text-right">R² w/ noise</TableHead>
                    : <TableHead className="text-right" title="RMSE on the chained batches: measured curve → kinetics-predicted curve">Chained RMSE ({unit})</TableHead>}
                  <TableHead className="text-right" title="|train R² − validation R²|">Overfit gap</TableHead>
                  <SortHeader label="Score" sortKey="composite_score" current={sortKey} onSort={setSortKey} className="text-right" />
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => {
                  const { run, name, metrics } = entry;
                  const active = isActive(entry);
                  const runIsActive = registry.active?.run_id === run.run_id;
                  const disqualified = metrics.physics_ok === false;
                  return (
                    <TableRow key={`${run.run_id}/${name}`} className={cn(active && "bg-green-600/5")}>
                      <TableCell className="text-xs">
                        <button className="text-left hover:text-primary" onClick={() => onDetails(run)} title="Open run details">
                          {run.label && <div className="font-medium text-sm">{run.label}</div>}
                          <div className="tabular-nums">{formatRunDate(run.created_at)}</div>
                          <div className="font-mono text-muted-foreground">{run.run_id}</div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{name}</span>
                          {active && <Badge className="bg-green-600 text-white">Active</Badge>}
                          {run.recommended_model === name && <Badge variant="outline">Recommended</Badge>}
                          {run.tuned && <Badge variant="outline">Tuned</Badge>}
                          {disqualified && (
                            <Badge variant="outline" className="text-red-400 border-red-400/40"
                              title={`Max prediction ${metrics.max_prediction?.toFixed(1)} °C`}>
                              &gt;100 °C
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{metrics.cv_r2.toFixed(3)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatError(metrics.cv_rmse, model)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatError(metrics.cv_mae, model)}</TableCell>
                      {isKinetics ? (
                        <TableCell className="text-right tabular-nums">{metrics.noise_r2?.toFixed(3) ?? "—"}</TableCell>
                      ) : (
                        <TableCell className="text-right tabular-nums whitespace-nowrap"
                          title={metrics.chained ? `${metrics.chained.n} batches: measured curve → predicted curve` : run.chain?.reason}>
                          {metrics.chained && metrics.measured_same_subset
                            ? <><span className="text-muted-foreground">{formatError(metrics.measured_same_subset.cv_rmse, model)} → </span>{formatError(metrics.chained.cv_rmse, model)}</>
                            : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">{metrics.overfit_gap.toFixed(3)}</TableCell>
                      <TableCell className="text-right tabular-nums">{metrics.composite_score.toFixed(3)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap"
                        title={run.data.skipped_baseline_batches?.length ? `Skipped invalid batches: ${run.data.skipped_baseline_batches.join(", ")}` : undefined}>
                        {run.data.session_ids.length} session(s)
                        {run.data.include_baseline ? ` + ${run.data.baseline_experiments} hist.` : ""}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Actions for {name} in {run.run_id}</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!active && (
                              <DropdownMenuItem onClick={() => onActivate(entry)}>Activate this model</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onDetails(run)}>Run details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExportRun(run)}>Export run (XLSX)</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              disabled={runIsActive}
                              onClick={() => onDelete(run)}
                            >
                              {runIsActive ? "Delete run (holds the active model)" : "Delete run"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
