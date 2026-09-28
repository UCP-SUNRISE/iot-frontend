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
}

/** Recursive partial used for settings updates. */
export type SystemSettingsChanges = {
  [K in keyof SystemSettings]?: Partial<SystemSettings[K]>;
};
