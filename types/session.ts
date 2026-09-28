/** Per-model result of the Edge Server's training eligibility rules (`app/training_data.py`). */
export interface ModelEligibility {
  eligible: boolean;
  /** Human-readable reasons the session is excluded; empty when eligible. */
  reasons: string[];
}

export type TrainingModel = "kinetics" | "hardness";

/** A row of the `get_sessions` DB response. */
export interface SessionRow {
  session_id: string;
  experiment_name: string | null;
  operator: string | null;
  is_active: number;
  /** 1 when a researcher selected the session for training. */
  is_approved: number;
  start_time: string | null;
  end_time: string | null;
  final_hardness: number | null;
  hardness_notes: string | null;
  hardness_recorded_by: string | null;
  hardness_recorded_at: string | null;
  telemetry_points: number;
  weather_points: number;
  temperature_max: number | null;
  training_eligibility: Record<TrainingModel, ModelEligibility>;
}

export interface SessionTrainingChanges {
  is_approved?: boolean;
  final_hardness?: number | null;
  hardness_notes?: string | null;
}
