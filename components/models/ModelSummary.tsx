"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LegacyModel, ModelEntry, ModelRegistry } from "@/types/models";
import { TrainingModel } from "@/types/session";
import { cn } from "@/lib/utils";
import { errorUnit, formatError, formatRunDate } from "./format";

type MetricKey = "cv_r2" | "cv_rmse" | "cv_mae" | "noise_r2";
type MetricValues = Partial<Record<MetricKey, number | null>>;

interface MetricDef {
  key: MetricKey;
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

const LEGACY_EVALUATION_LABEL: Record<LegacyModel["evaluation"], string> = {
  in_sample: "Scored on its own training data",
  original_loocv: "Scores from its original training",
};

function legacyValues(legacy: LegacyModel): MetricValues {
  return { cv_r2: legacy.metrics.r2, cv_rmse: legacy.metrics.rmse, cv_mae: legacy.metrics.mae };
}

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

function MetricGrid({ values, compareTo, model, unit, muted }: {
  values: MetricValues;
  compareTo?: MetricValues | null;
  model: TrainingModel;
  unit: string;
  /** Dim the numbers when they are not validated scores. */
  muted?: boolean;
}) {
  const defs = METRICS.filter(d => !d.kineticsOnly || model === "kinetics");
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {defs.map(def => {
        const value = values[def.key];
        const other = compareTo?.[def.key];
        return (
          <div key={def.key} title={def.hint}>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{def.label}</dt>
            <dd className={cn("text-2xl font-bold tabular-nums", muted && "text-muted-foreground")}>
              {value != null ? formatMetric(def, value, model) : "—"}
              {value != null && (def.key === "cv_rmse" || def.key === "cv_mae") && (
                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
              )}
            </dd>
            {value != null && other != null && <Delta def={def} current={other} candidate={value} model={model} />}
          </div>
        );
      })}
    </dl>
  );
}

/** Hardness only: error on measured curves vs on the kinetics model's predicted curves, same batches. */
function ChainedLine({ entry, unit }: { entry: ModelEntry; unit: string }) {
  const { chained, measured_same_subset: measured } = entry.metrics;
  const chain = entry.run.chain;
  if (!chained || !measured) {
    return (
      <p className="text-xs text-muted-foreground">
        Chained accuracy not available: {chain?.reason ?? "this run predates chained evaluation. Train the kinetics model, then retrain."}
      </p>
    );
  }
  return (
    <div
      className="rounded-md bg-muted/40 px-3 py-2 text-xs"
      title={`Same ${chained.n} batches in both numbers. Kinetics curves from ${chain?.kinetics_source?.model_name ?? "?"} (${chain?.kinetics_source?.run_id ?? "?"}).`}
    >
      <div className="text-muted-foreground">Chained with the kinetics model ({chained.n} batches)</div>
      <div className="flex items-center gap-2 text-sm tabular-nums">
        <span>RMSE {formatError(measured.cv_rmse, "hardness")} {unit}</span>
        <span className="text-muted-foreground">measured curve</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold">{formatError(chained.cv_rmse, "hardness")} {unit}</span>
        <span className="text-muted-foreground">predicted curve</span>
      </div>
    </div>
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

function Caution({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-500/90">
      <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
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
  const legacy = registry.legacy ?? null;
  const bestIsActive = !!(active && best && active.run.run_id === best.run.run_id && active.name === best.name);
  // What the best alternative is compared against: the active registry model, else the legacy model
  const reference: MetricValues | null = active ? active.metrics : legacy ? legacyValues(legacy) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SummaryCard title="Active model" badge={<Badge className="bg-green-600 text-white">In use</Badge>}>
        {active ? (
          <>
            <div>
              <div className="text-lg font-semibold">{active.name}</div>
              <p className="text-xs text-muted-foreground font-mono">{active.run.run_id}</p>
            </div>
            <MetricGrid values={active.metrics} model={model} unit={unit} />
            {model === "hardness" && <ChainedLine entry={active} unit={unit} />}
            <DataLine entry={active} />
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Legacy model</span>
                {legacy && <Badge variant="outline">{LEGACY_EVALUATION_LABEL[legacy.evaluation]}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{legacy?.file ?? "pre-trained model"}</p>
            </div>
            {legacy ? (
              <>
                <MetricGrid values={legacyValues(legacy)} model={model} unit={unit} muted />
                <Caution>{legacy.note}</Caution>
              </>
            ) : (
              <CardDescription>
                The original pre-trained model is in use and no reference metrics are available for it.
              </CardDescription>
            )}
          </>
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
            <MetricGrid values={best.metrics} compareTo={reference} model={model} unit={unit} />
            {model === "hardness" && <ChainedLine entry={best} unit={unit} />}
            <DataLine entry={best} />
            {!active && legacy && (
              <Caution>
                Differences are against the legacy model&apos;s scores, which were obtained differently. Treat them as indicative.
              </Caution>
            )}
            {active && active.run.run_id !== best.run.run_id && (
              <Caution>Trained on different data than the active model, so the comparison is indicative.</Caution>
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
