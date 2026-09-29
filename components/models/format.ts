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

export function formatRunDate(iso: string): string {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
