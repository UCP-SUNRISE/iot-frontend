"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Data, Layout } from "plotly.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrainingRunDetail } from "@/types/models";
import { shortExperimentId } from "./format";

// Dynamically import Plotly to prevent SSR issues (same pattern as ThermalLineChart)
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BASE_LAYOUT: Partial<Layout> = {
  autosize: true,
  margin: { l: 50, r: 20, t: 10, b: 90, pad: 0 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#a1a1aa", size: 11 },
  legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
};
const GRID = "rgba(255,255,255,0.06)";
const COLORS = { actual: "#a1a1aa", predicted: "#0ea5e9", chained: "#f97316", bar: "#0ea5e9" };

function Chart({ data, layout }: { data: Data[]; layout: Partial<Layout> }) {
  return (
    <div className="h-[320px] w-full">
      <Plot
        data={data}
        layout={{ ...BASE_LAYOUT, ...layout }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}

function Picker({ label, value, options, onChange, format = (v: string) => v }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; format?: (v: string) => string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-56" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option} value={option}>{format(option)}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

/**
 * Charts of a run's validation results, for the model picked by the user:
 * kinetics shows error per held-out experiment and one experiment's measured vs predicted curve;
 * hardness shows actual vs predicted per batch (and the chained prediction where available).
 */
export function RunCharts({ run, errorUnit }: { run: TrainingRunDetail; errorUnit: string }) {
  const models = Object.keys(run.metrics);
  const [model, setModel] = useState(run.recommended_model in run.metrics ? run.recommended_model : models[0]);
  const folds = useMemo(() => run.metrics[model]?.folds ?? [], [run, model]);
  const experiments = useMemo(() => folds.map(f => f.experiment_id), [folds]);
  const [experiment, setExperiment] = useState(experiments[0] ?? "");
  const predictions = run.predictions;

  // Rows of the chosen experiment in the column-wise predictions (kinetics)
  const curve = useMemo(() => {
    if (!predictions?.elapsed_time || !predictions.models[model]) return null;
    const index = predictions.experiment_id.flatMap((id, i) => (id === experiment ? [i] : []));
    return {
      time: index.map(i => predictions.elapsed_time![i]),
      actual: index.map(i => predictions.actual[i]),
      predicted: index.map(i => predictions.models[model][i]),
    };
  }, [predictions, model, experiment]);

  const labels = experiments.map(shortExperimentId);
  const modelPicker = <Picker label="Model" value={model} options={models} onChange={setModel} />;

  if (run.model_type === "hardness") {
    const hasChained = folds.some(f => f.predicted_chained != null);
    return (
      <div className="space-y-2">
        {modelPicker}
        <Chart
          data={[
            { type: "bar", name: "Measured", x: labels, y: folds.map(f => f.actual ?? null), marker: { color: COLORS.actual } },
            { type: "bar", name: "Predicted (measured curve)", x: labels, y: folds.map(f => f.predicted ?? null), marker: { color: COLORS.predicted } },
            ...(hasChained ? [{
              type: "bar" as const, name: "Predicted (kinetics curve, chained)", x: labels,
              y: folds.map(f => f.predicted_chained ?? null), marker: { color: COLORS.chained },
            }] : []),
          ]}
          layout={{
            barmode: "group",
            xaxis: { tickangle: -40, gridcolor: GRID },
            yaxis: { title: { text: `Final hardness (${errorUnit})` }, gridcolor: GRID },
          }}
        />
        <p className="text-xs text-muted-foreground">
          Each batch is predicted by a model trained on all other batches.
          {hasChained && " Orange bars use the kinetics model's predicted water curve instead of the measured one."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {modelPicker}
        <Chart
          data={[{ type: "bar", name: "RMSE", x: labels, y: folds.map(f => f.rmse ?? null), marker: { color: COLORS.bar } }]}
          layout={{
            showlegend: false,
            xaxis: { tickangle: -40, gridcolor: GRID },
            yaxis: { title: { text: `RMSE when held out (${errorUnit})` }, gridcolor: GRID },
          }}
        />
        <p className="text-xs text-muted-foreground">
          Error on each experiment when it was left out of training. Tall bars are experiments the model generalises to worst.
        </p>
      </div>

      {curve ? (
        <div className="space-y-2">
          <Picker label="Held-out experiment" value={experiment} options={experiments} onChange={setExperiment} format={shortExperimentId} />
          <Chart
            data={[
              { type: "scatter", mode: "lines", name: "Measured", x: curve.time, y: curve.actual, line: { color: COLORS.actual, width: 2 } },
              { type: "scatter", mode: "lines", name: "Predicted (out-of-fold)", x: curve.time, y: curve.predicted, line: { color: COLORS.predicted, width: 2 } },
            ]}
            layout={{
              margin: { l: 50, r: 20, t: 10, b: 45, pad: 0 },
              xaxis: { title: { text: "Elapsed time (min)" }, gridcolor: GRID },
              yaxis: { title: { text: "Water temperature (°C)" }, gridcolor: GRID },
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Measured-vs-predicted curves are not available: this run was trained before predictions were stored.
        </p>
      )}
    </div>
  );
}
