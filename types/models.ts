import { TrainingModel } from "@/types/session";

/** Per-candidate metrics stored in a training run's manifest (ML services' src/training). */
export interface ModelMetrics {
  cv_r2: number;
  cv_rmse: number;
  cv_mae: number;
  train_r2: number;
  overfit_gap: number;
  composite_score: number;
  /** Kinetics only: out-of-fold R² with sensor noise injected. */
  noise_r2?: number;
  /** Kinetics only: no prediction exceeded the 100 °C physical limit. */
  physics_ok?: boolean;
  max_prediction?: number;
}

export interface TrainingRun {
  run_id: string;
  model_type: TrainingModel;
  created_at: string;
  recommended_model: string;
  data: {
    rows: number;
    experiments: number;
    session_ids: string[];
    baseline_experiments: number;
    include_baseline: boolean;
    features: string[];
    solar_source?: string;
    skipped_baseline_batches?: string[];
  };
  metrics: Record<string, ModelMetrics>;
}

export interface ActiveModel {
  run_id: string;
  model_name: string;
  activated_at: string;
}

/** Response of `sunrise/ml/models/request`. `active` is null while the legacy pre-registry model is in use. */
export interface ModelRegistry {
  model: TrainingModel;
  active: ActiveModel | null;
  runs: TrainingRun[];
}

/** A background training job as re-published on `sunrise/ml/train/status/{model}`. */
export interface TrainingJob {
  job_id: string;
  model: TrainingModel;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string | null;
  result?: TrainingRun | null;
  created_at?: string;
  updated_at?: string;
  session_count?: number;
}

/** One trained candidate, flattened across runs for tables and comparisons. */
export interface ModelEntry {
  run: TrainingRun;
  name: string;
  metrics: ModelMetrics;
}

export function flattenRuns(runs: TrainingRun[]): ModelEntry[] {
  return runs.flatMap(run =>
    Object.entries(run.metrics).map(([name, metrics]) => ({ run, name, metrics }))
  );
}
