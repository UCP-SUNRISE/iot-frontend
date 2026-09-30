import * as XLSX from "xlsx";
import { ModelRegistry, TrainingRunDetail, flattenRuns } from "@/types/models";

type Row = Record<string, string | number | boolean | null>;

/** Cell-safe value: objects and arrays become JSON text, undefined becomes empty. */
function cell(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

function keyValueRows(section: string, entries: Record<string, unknown>): Row[] {
  return Object.entries(entries).map(([item, value]) => ({ Section: section, Item: item, Value: cell(value) }));
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: Row[], widths?: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: "No data" }]);
  if (widths) ws["!cols"] = widths.map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

/**
 * The complete record of one training run as a workbook: what data was used, how every
 * model was built and validated, how the winner was chosen, and every out-of-fold prediction.
 * Pure (no download) so it can be tested outside the browser.
 */
export function buildRunWorkbook(run: TrainingRunDetail, errorUnit: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const models = Object.keys(run.metrics);
  const isHardness = run.model_type === "hardness";

  // --- Summary ---------------------------------------------------------------
  addSheet(wb, "Summary", [
    ...keyValueRows("Run", {
      "Run ID": run.run_id,
      "Model type": run.model_type,
      "Trained at (UTC)": run.created_at,
      "Label": run.label,
      "Notes": run.notes,
      "Requested by": run.requested_by,
      "Duration (s)": run.duration_seconds,
      "Hyperparameters tuned": run.tuned ?? false,
      "Recommended model": run.recommended_model,
      "Models trained": models.join(", "),
      "Error unit (RMSE, MAE)": errorUnit,
    }),
    ...keyValueRows("Data", {
      "Target": run.data.target,
      "Features": run.data.features.join(", "),
      "Rows": run.data.rows,
      "Experiments": run.data.experiments,
      "Sessions": run.data.session_ids.length,
      "Session IDs": run.data.session_ids.join(", "),
      "Historical experiments": run.data.baseline_experiments,
      "Historical data included": run.data.include_baseline,
      ...(run.data.solar_source ? { "Solar radiation source": run.data.solar_source } : {}),
      ...(run.data.skipped_baseline_batches ? { "Historical batches rejected": run.data.skipped_baseline_batches.join(", ") } : {}),
    }),
    ...(run.chain ? keyValueRows("Chained evaluation", {
      "Available": run.chain.available,
      "Batches evaluated": run.chain.batches,
      "Kinetics run": run.chain.kinetics_source?.run_id,
      "Kinetics model": run.chain.kinetics_source?.model_name,
      "Kinetics model chosen as": run.chain.kinetics_source?.basis,
      ...(run.chain.reason ? { "Reason unavailable": run.chain.reason } : {}),
    }) : []),
  ], [22, 30, 90]);

  // --- Methods ---------------------------------------------------------------
  const m = run.methods;
  if (m) {
    // The experiment list gets its own sheet ("Data"); everything else is listed here
    const provenance = Object.fromEntries(Object.entries(m.data_provenance).filter(([key]) => key !== "experiments"));
    addSheet(wb, "Methods", [
      ...keyValueRows("Software", m.software),
      ...keyValueRows("Reproducibility", {
        "Random seed": m.random_seed,
        ...(m.training_threads != null ? { "Training threads": m.training_threads } : {}),
        "Started (UTC)": m.started_at,
        "Finished (UTC)": m.finished_at,
      }),
      ...keyValueRows("Preprocessing", m.preprocessing),
      ...keyValueRows("Validation", m.validation),
      ...keyValueRows("Hyperparameter tuning", { Enabled: m.tuning.enabled, Method: m.tuning.method }),
      ...keyValueRows("Model selection", {
        Rule: m.selection.rule,
        Disqualified: m.selection.disqualified.join(", ") || "none",
        "Recommended model": m.selection.recommended_model,
      }),
      ...keyValueRows("Data provenance", provenance),
    ], [24, 30, 120]);

    addSheet(wb, "Data", m.data_provenance.experiments.map(experiment => {
      const row: Row = {};
      for (const [key, value] of Object.entries(experiment)) row[key] = cell(value);
      return row;
    }), [44, 14, 16]);

    addSheet(wb, "Selection", m.selection.ranking.map(r => ({
      Rank: r.rank,
      Model: r.model,
      "Composite score": r.composite_score,
      "R2 (validation)": r.cv_r2,
      ...(r.noise_r2 != null ? { "R2 (validation, with noise)": r.noise_r2 } : {}),
      "Overfit gap": r.overfit_gap,
      ...(r.max_prediction != null ? { "Max prediction": r.max_prediction } : {}),
      ...(r.physics_ok != null ? { "Within physical limit": r.physics_ok } : {}),
      Selected: r.selected,
    })), [6, 26, 16, 16, 26, 12, 14, 20, 9]);
  } else {
    addSheet(wb, "Methods", [{ Note: "This run was trained before the methods record was introduced. Retrain to obtain it." }], [100]);
  }

  // --- Candidates: one row per hyperparameter -----------------------------------
  addSheet(wb, "Candidates", models.flatMap(name =>
    (run.metrics[name].model?.steps ?? []).flatMap(step =>
      Object.entries(step.hyperparameters).map(([parameter, value]) => ({
        Model: name, Step: step.name, Estimator: step.estimator, Hyperparameter: parameter, Value: cell(value),
      }))
    )
  ), [26, 14, 34, 28, 40]);

  // --- Metrics: one row per model -------------------------------------------------
  addSheet(wb, "Metrics", models.map(name => {
    const x = run.metrics[name];
    return {
      Model: name,
      Recommended: name === run.recommended_model,
      "R2 (validation)": x.cv_r2,
      [`RMSE (validation, ${errorUnit})`]: x.cv_rmse,
      [`MAE (validation, ${errorUnit})`]: x.cv_mae,
      ...(x.fold_rmse_mean != null ? { "RMSE per experiment, mean": x.fold_rmse_mean, "RMSE per experiment, std": x.fold_rmse_std ?? null } : {}),
      "R2 (training)": x.train_r2,
      "Overfit gap": x.overfit_gap,
      ...(x.noise_r2 != null ? { "R2 (validation, with noise)": x.noise_r2 } : {}),
      ...(x.max_prediction != null ? { "Max prediction": x.max_prediction, "Within physical limit": x.physics_ok ?? null } : {}),
      "Composite score": x.composite_score,
      ...(x.chained && x.measured_same_subset ? {
        "Chained: batches": x.chained.n,
        [`Chained subset, measured curve: RMSE (${errorUnit})`]: x.measured_same_subset.cv_rmse,
        [`Chained subset, predicted curve: RMSE (${errorUnit})`]: x.chained.cv_rmse,
        "Chained subset, measured curve: R2": x.measured_same_subset.cv_r2,
        "Chained subset, predicted curve: R2": x.chained.cv_r2,
        [`Chained subset, measured curve: MAE (${errorUnit})`]: x.measured_same_subset.cv_mae,
        [`Chained subset, predicted curve: MAE (${errorUnit})`]: x.chained.cv_mae,
      } : {}),
    };
  }), [26, 13, 15, 22, 22, 24, 22, 14, 12, 26, 15, 20, 16]);

  // --- Per-experiment: every held-out fold of every model ---------------------------
  addSheet(wb, "Per-experiment", models.flatMap(name =>
    (run.metrics[name].folds ?? []).map(fold => ({
      Model: name,
      "Held-out experiment": fold.experiment_id,
      ...(fold.rows != null ? { Rows: fold.rows } : {}),
      ...(fold.rmse != null ? { [`RMSE (${errorUnit})`]: fold.rmse, [`MAE (${errorUnit})`]: fold.mae ?? null } : {}),
      ...(fold.actual != null ? { Actual: fold.actual, Predicted: fold.predicted ?? null } : {}),
      ...(isHardness ? { "Predicted (chained)": fold.predicted_chained ?? null } : {}),
      ...(fold.tuned_params ? { "Tuned hyperparameters": cell(fold.tuned_params) } : {}),
    }))
  ), [26, 44, 10, 14, 14, 20, 40]);

  // --- Tuning (only when used) ---------------------------------------------------------
  if (models.some(name => run.metrics[name].tuning)) {
    addSheet(wb, "Tuning", models.filter(name => run.metrics[name].tuning).map(name => ({
      Model: name,
      "Search grid": cell(run.metrics[name].tuning?.grid),
      "Final hyperparameters": cell(run.metrics[name].tuning?.final_params),
    })), [26, 80, 60]);
  }

  // --- Chained matches (hardness) ---------------------------------------------------------
  if (run.chain?.available) {
    addSheet(wb, "Chained", run.chain.matches.map(match => ({
      "Hardness batch": match.batch,
      "Kinetics experiment": match.kinetics_experiment,
    })), [44, 44]);
  }

  // --- Predictions: every out-of-fold prediction ---------------------------------------------
  const p = run.predictions;
  if (p) {
    addSheet(wb, "Predictions", p.actual.map((actual, i) => {
      const row: Row = { Experiment: p.experiment_id[i] };
      if (p.elapsed_time) row["Elapsed time (min)"] = p.elapsed_time[i];
      row.Actual = actual;
      for (const name of Object.keys(p.models)) row[name] = p.models[name][i];
      for (const name of Object.keys(p.chained ?? {})) row[`${name} (chained)`] = p.chained?.[name][i] ?? null;
      return row;
    }), [44, 18, 12]);
  } else {
    addSheet(wb, "Predictions", [{ Note: "Out-of-fold predictions were not stored for this run. Retrain to obtain them." }], [90]);
  }

  return wb;
}

/** One row per trained model across all runs, for comparing runs side by side. */
export function buildComparisonWorkbook(registry: ModelRegistry, errorUnit: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  addSheet(wb, "All models", flattenRuns(registry.runs).map(({ run, name, metrics }) => ({
    "Run ID": run.run_id,
    "Trained at (UTC)": run.created_at,
    Label: run.label ?? null,
    Model: name,
    Active: registry.active?.run_id === run.run_id && registry.active?.model_name === name,
    "Recommended in run": run.recommended_model === name,
    Tuned: run.tuned ?? false,
    "R2 (validation)": metrics.cv_r2,
    [`RMSE (validation, ${errorUnit})`]: metrics.cv_rmse,
    [`MAE (validation, ${errorUnit})`]: metrics.cv_mae,
    "R2 (training)": metrics.train_r2,
    "Overfit gap": metrics.overfit_gap,
    "R2 (validation, with noise)": metrics.noise_r2 ?? null,
    "Within physical limit": metrics.physics_ok ?? null,
    "Composite score": metrics.composite_score,
    [`Chained RMSE (${errorUnit})`]: metrics.chained?.cv_rmse ?? null,
    [`Same batches, measured RMSE (${errorUnit})`]: metrics.measured_same_subset?.cv_rmse ?? null,
    Experiments: run.data.experiments,
    Sessions: run.data.session_ids.length,
    "Historical experiments": run.data.baseline_experiments,
    Rows: run.data.rows,
  })), [24, 28, 28, 26, 8, 18, 8, 15, 22, 22, 13, 12, 24, 20, 15, 20, 32, 12, 9, 22, 8]);

  if (registry.legacy) {
    addSheet(wb, "Legacy model", keyValueRows("Legacy model", {
      File: registry.legacy.file,
      Evaluation: registry.legacy.evaluation,
      R2: registry.legacy.metrics.r2,
      [`RMSE (${errorUnit})`]: registry.legacy.metrics.rmse,
      [`MAE (${errorUnit})`]: registry.legacy.metrics.mae,
      Note: registry.legacy.note,
    }), [16, 16, 110]);
  }
  return wb;
}

export function exportTrainingRun(run: TrainingRunDetail, errorUnit: string) {
  XLSX.writeFile(buildRunWorkbook(run, errorUnit), `SUNRISE_Training_${run.run_id}.xlsx`);
}

export function exportAllRuns(registry: ModelRegistry, errorUnit: string) {
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(buildComparisonWorkbook(registry, errorUnit), `SUNRISE_Models_${registry.model}_${date}.xlsx`);
}
