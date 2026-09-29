"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelEntry, ModelRegistry } from "@/types/models";
import { TrainingModel } from "@/types/session";
import { cn } from "@/lib/utils";
import { errorUnit, formatError, formatRunDate } from "./format";

interface MetricDef {
  key: "cv_r2" | "cv_rmse" | "cv_mae" | "noise_r2";
  label: string;
  hint: string;
  higherIsBetter: boolean;
  kineticsOnly?: boolean;
}

const METRICS: MetricDef[] = [
  { key: "cv_r2", label: "R²", hint: "Out-of-experiment R²", higherIsBetter: true },
  { key: "cv_rmse", label: "RMSE", hint: "Out-of-experiment root-mean-square error", higherIsBetter: false },
  { key: "cv_mae", label: "MAE", hint: "Out-of-experiment mean absolute error", higherIsBetter: false },
  { key: "noise_r2", label: "R² w/ noise", hint: "R² with 15% sensor noise on irradiance and air temperature", higherIsBetter: true, kineticsOnly: true },
];

function formatMetric(def: MetricDef, value: number, model: TrainingModel): string {
  return def.key === "cv_rmse" || def.key === "cv_mae" ? formatError(value, model) : value.toFixed(3);
}

function Delta({ def, current, candidate, model }: { def: MetricDef; current: number; candidate: number; model: TrainingModel }) {
  const diff = candidate - current;
  const better = def.higherIsBetter ? diff > 0 : diff < 0;
  if (Math.abs(diff) < 1e-9) {
    return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />same</span>;
  }
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", better ? "text-green-500" : "text-red-400")}>
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : ""}{formatMetric(def, diff, model)}
    </span>
  );
}

function MetricGrid({ entry, compareTo, model, unit }: { entry: ModelEntry; compareTo?: ModelEntry | null; model: TrainingModel; unit: string }) {
  const defs = METRICS.filter(d => !d.kineticsOnly || model === "kinetics");
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {defs.map(def => {
        const value = entry.metrics[def.key];
        const other = compareTo?.metrics[def.key];
        return (
          <div key={def.key} title={def.hint}>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{def.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">
              {value != null ? formatMetric(def, value, model) : "—"}
              {value != null && (def.key === "cv_rmse" || def.key === "cv_mae") && (
                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
              )}
            </dd>
            {compareTo && value != null && other != null && <Delta def={def} current={other} candidate={value} model={model} />}
          </div>
        );
      })}
    </dl>
  );
}

function DataLine({ entry }: { entry: ModelEntry }) {
  const { data } = entry.run;
  return (
    <p className="text-xs text-muted-foreground">
      {data.experiments} experiment(s): {data.session_ids.length} session(s)
      {data.include_baseline ? ` + ${data.baseline_experiments} historical` : ""} · trained {formatRunDate(entry.run.created_at)}
    </p>
  );
}

function SummaryCard({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function ModelSummary({ model, registry, active, best, hardnessUnit, onActivate }: {
  model: TrainingModel;
  registry: ModelRegistry;
  active: ModelEntry | null;
  best: ModelEntry | null;
  hardnessUnit: string;
  onActivate: (entry: ModelEntry) => void;
}) {
  const unit = errorUnit(model, hardnessUnit);
  const bestIsActive = !!(active && best && active.run.run_id === best.run.run_id && active.name === best.name);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SummaryCard title="Active model" badge={<Badge className="bg-green-600 text-white">In use</Badge>}>
        {active ? (
          <>
            <div>
              <div className="text-lg font-semibold">{active.name}</div>
              <p className="text-xs text-muted-foreground font-mono">{active.run.run_id}</p>
            </div>
            <MetricGrid entry={active} model={model} unit={unit} />
            <DataLine entry={active} />
          </>
        ) : (
          <div className="space-y-1">
            <div className="text-lg font-semibold">Legacy model</div>
            <CardDescription>
              {registry.runs.length === 0
                ? "The original pre-trained model is in use. Train a model to get validated metrics."
                : "The original pre-trained model is in use. It has no leave-one-experiment-out metrics to compare."}
            </CardDescription>
          </div>
        )}
      </SummaryCard>

      <SummaryCard
        title={bestIsActive ? "Best model" : "Best alternative"}
        badge={bestIsActive ? <Badge variant="outline">Active is best</Badge> : undefined}
      >
        {best && !bestIsActive ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{best.name}</div>
                <p className="text-xs text-muted-foreground font-mono">{best.run.run_id}</p>
              </div>
              <button
                onClick={() => onActivate(best)}
                className="text-sm font-medium text-primary hover:underline underline-offset-4 shrink-0"
              >
                Activate
              </button>
            </div>
            <MetricGrid entry={best} compareTo={active} model={model} unit={unit} />
            <DataLine entry={best} />
            {active && active.run.run_id !== best.run.run_id && (
              <p className="text-xs text-amber-500/90">
                Trained on different data than the active model, so the comparison is indicative.
              </p>
            )}
          </>
        ) : (
          <CardDescription>
            {best ? "No trained model beats the active one on out-of-experiment RMSE." : "No trained models yet."}
          </CardDescription>
        )}
      </SummaryCard>
    </div>
  );
}
