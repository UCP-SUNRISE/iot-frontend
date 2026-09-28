/**
 * System-wide settings owned by the Edge Server (`app/settings.py`).
 * Broadcast retained on `sunrise/system/settings`; updated via `sunrise/system/settings/set`.
 * Keep in sync with DEFAULT_SETTINGS / SETTINGS_SCHEMA on the server.
 */
export interface SystemSettings {
  sensor_limits: {
    enabled: boolean;
    warn_fraction: number;
    cooldown_minutes: number;
    sht30_max_temp: number;
    bpw34_max_temp: number;
  };
  telemetry: {
    poll_interval_seconds: number;
  };
  weather: {
    /** Weather readings older than this are not attached to telemetry rows. */
    max_age_seconds: number;
  };
  training: {
    /** Hardness is always required for the hardness model; this extends it to kinetics. */
    kinetics_requires_hardness: boolean;
    min_telemetry_points: number;
    /** Fraction (0–1) of telemetry points that must carry weather data. */
    min_weather_coverage: number;
    hardness_unit: HardnessUnit;
    /** Train on eligible sessions plus the historical Excel datasets. */
    include_baseline: boolean;
    /** Irradiance feature for the kinetics model. */
    solar_source: "oven" | "station";
  };
}

export const HARDNESS_UNITS = ["N", "g", "kgf"] as const;
export type HardnessUnit = typeof HARDNESS_UNITS[number];

/** Recursive partial used for settings updates. */
export type SystemSettingsChanges = {
  [K in keyof SystemSettings]?: Partial<SystemSettings[K]>;
};
