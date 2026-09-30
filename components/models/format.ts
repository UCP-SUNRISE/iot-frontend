import { TrainingModel } from "@/types/session";

export const MODEL_TITLES: Record<TrainingModel, string> = {
  kinetics: "Temperature kinetics",
  hardness: "Hardness",
};

export const MODEL_DESCRIPTIONS: Record<TrainingModel, string> = {
  kinetics: "Predicts the water-temperature heating curve from weather and irradiance. Drives the forecast windows.",
  hardness: "Predicts final chickpea TPA hardness from a cooking curve and the raw hardness of the lot.",
};

/** Unit of the model's error metrics (RMSE/MAE). */
export function errorUnit(model: TrainingModel, hardnessUnit: string): string {
  return model === "kinetics" ? "°C" : hardnessUnit;
}

export function formatError(value: number, model: TrainingModel): string {
  return model === "kinetics" ? value.toFixed(2) : value.toFixed(0);
}

/** "45 s", "3 min", "1 h 20 min": coarse on purpose, these are estimates. */
export function formatDuration(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Experiment ids are "session:<id>" or "baseline:<file>:<n>" / "baseline:<batch>"; drop the prefix for display. */
export function shortExperimentId(id: string): string {
  return id.replace(/^(session|baseline):/, "");
}

export function formatRunDate(iso: string): string {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
