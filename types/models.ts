import { TrainingModel } from "@/types/session";

/** R², RMSE and MAE over a set of held-out batches (hardness chained evaluation). */
export interface SubsetScores {
  n: number;
  /** Undefined for fewer than two batches. */
  cv_r2: number | null;
  cv_rmse: number;
  cv_mae: number;
}

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
  fold_rmse_mean?: number;
  fold_rmse_std?: number;
  /** Hardness only: accuracy when fed the kinetics model's predicted curves. */
  chained?: SubsetScores;
  /** Hardness only: accuracy on measured curves, for the same batches as `chained`. */
  measured_same_subset?: SubsetScores;
}

/** Whether chained accuracy could be computed for a hardness run, and from which kinetics model. */
export interface ChainInfo {
  available: boolean;
  kinetics_source: { run_id: string; model_name: string; basis?: string } | null;
  batches: number;
  matches: { batch: string; kinetics_experiment: string }[];
  reason?: string;
}

/** Run summary, as listed by `sunrise/ml/models/request`. */
export interface TrainingRun {
  run_id: string;
  model_type: TrainingModel;
  created_at: string;
  recommended_model: string;
  /** Absent on runs trained before the full record was introduced. */
  tuned?: boolean;
  duration_seconds?: number;
  requested_by?: string | null;
  label?: string | null;
  notes?: string | null;
  chain?: ChainInfo;
  data: {
    rows: number;
    experiments: number;
    session_ids: string[];
    baseline_experiments: number;
    include_baseline: boolean;
    features: string[];
    target?: string;
    solar_source?: string;
    skipped_baseline_batches?: string[];
  };
  metrics: Record<string, ModelMetrics>;
}

export interface EstimatorStep {
  name: string;
  estimator: string;
  hyperparameters: Record<string, unknown>;
}

/** One held-out experiment: kinetics reports errors, hardness the actual and predicted value. */
export interface FoldResult {
  experiment_id: string;
  rows?: number;
  rmse?: number;
  mae?: number;
  actual?: number;
  predicted?: number;
  predicted_chained?: number;
  tuned_params?: Record<string, unknown>;
}

export interface ModelMetricsDetail extends ModelMetrics {
  folds: FoldResult[];
  model?: { steps: EstimatorStep[] };
  tuning?: { grid: Record<string, unknown[]>; final_params: Record<string, unknown> };
}

export interface SelectionRow {
  rank: number;
  model: string;
  composite_score: number;
  cv_r2: number;
  overfit_gap: number;
  noise_r2?: number;
  max_prediction?: number;
  physics_ok?: boolean;
  selected: boolean;
}

/** The methods record of a run: everything needed to describe it in a publication. */
export interface RunMethods {
  software: Record<string, string | null>;
  random_seed: number;
  training_threads?: number;
  started_at: string;
  finished_at: string;
  data_provenance: Record<string, unknown> & {
    experiments: ({ experiment_id: string } & Record<string, unknown>)[];
  };
  preprocessing: Record<string, string>;
  validation: Record<string, string>;
  tuning: { enabled: boolean; method: string };
  selection: { rule: string; ranking: SelectionRow[]; disqualified: string[]; recommended_model: string };
}

/** Out-of-fold predictions, column-wise. Kinetics: one row per minute; hardness: one per batch. */
export interface RunPredictions {
  experiment_id: string[];
  elapsed_time?: number[];
  actual: number[];
  models: Record<string, number[]>;
  chained?: Record<string, (number | null)[]>;
}

/** Full record of a run (`sunrise/ml/runs/detail/request`). */
export interface TrainingRunDetail extends Omit<TrainingRun, "metrics"> {
  metrics: Record<string, ModelMetricsDetail>;
  /** Absent on runs trained before the full record was introduced. */
  methods?: RunMethods;
  /** Null when the run predates stored predictions; undefined when not requested. */
  predictions?: RunPredictions | null;
}

export interface ActiveModel {
  run_id: string;
  model_name: string;
  activated_at: string;
}

/** Reference metrics of the pre-registry model, with how they were obtained. */
export interface LegacyModel {
  name: string;
  file: string;
  evaluation: "in_sample" | "original_loocv";
  note: string;
  metrics: { r2: number | null; rmse: number | null; mae: number | null };
  experiments: number | null;
  rows: number | null;
}

/** Response of `sunrise/ml/models/request`. `active` is null while the legacy pre-registry model is in use. */
export interface ModelRegistry {
  model: TrainingModel;
  active: ActiveModel | null;
  legacy?: LegacyModel | null;
  runs: TrainingRun[];
}

/** An algorithm of the model library (`sunrise/ml/candidates/request`). */
export interface ModelCandidate {
  name: string;
  description: string;
  model: { steps: EstimatorStep[] };
  tuning_grid: Record<string, unknown[]>;
}

export interface TrainOptions {
  /** Names to train; omit to train the whole library. */
  candidates?: string[];
  tune: boolean;
  label?: string;
}

/** A background training job as re-published on `sunrise/ml/train/status/{model}`. */
export interface TrainingJob {
  job_id: string;
  model: TrainingModel;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message: string;
  error?: string | null;
  result?: TrainingRun | null;
  created_at?: string;
  updated_at?: string;
  session_count?: number;
  elapsed_seconds?: number;
  /** Estimated seconds remaining; null until enough progress has been made. */
  eta_seconds?: number | null;
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
