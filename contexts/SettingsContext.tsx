"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";

/**
 * Per-browser display preferences.
 *
 * These only affect how *this* researcher sees the dashboard, so they live in
 * localStorage. System-wide settings (alert thresholds, training policy) belong
 * on the Edge Server so every client and the controller share one source of truth.
 */
export type SpatialMetric = "temperature" | "humidity" | "light";

export interface UiSettings {
  spatial: {
    /** Show the exploratory 3D sensor-cube panels. Off by default: cube sensors are optional hardware. */
    visible: boolean;
    metrics: Record<SpatialMetric, boolean>;
  };
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  spatial: {
    visible: false,
    metrics: { temperature: true, humidity: true, light: true },
  },
};

const STORAGE_KEY = "sunrise.ui-settings.v1";

// Merge stored values over defaults so settings added in later releases get their default value.
function mergeWithDefaults(stored: Partial<UiSettings> | null): UiSettings {
  return {
    spatial: {
      ...DEFAULT_UI_SETTINGS.spatial,
      ...stored?.spatial,
      metrics: { ...DEFAULT_UI_SETTINGS.spatial.metrics, ...stored?.spatial?.metrics },
    },
  };
}

// --- localStorage-backed external store ------------------------------------
// Falls back to memory when storage is unavailable (private mode, blocked site data).
let memoryRaw: string | null = null;
let cachedRaw: string | null | undefined;
let cachedSettings: UiSettings = DEFAULT_UI_SETTINGS;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function writeRaw(raw: string) {
  memoryRaw = raw;
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch (err) {
    console.warn("Failed to persist UI settings, keeping them in memory", err);
  }
  listeners.forEach(notify => notify());
}

function getSnapshot(): UiSettings {
  const raw = readRaw();
  // Return a stable reference unless storage changed, as useSyncExternalStore requires.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSettings = raw ? mergeWithDefaults(JSON.parse(raw)) : DEFAULT_UI_SETTINGS;
    } catch {
      cachedSettings = DEFAULT_UI_SETTINGS;
    }
  }
  return cachedSettings;
}

const getServerSnapshot = () => DEFAULT_UI_SETTINGS;

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Keeps other open tabs in sync.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

// ---------------------------------------------------------------------------

interface SettingsContextType {
  settings: UiSettings;
  updateSettings: (updater: (prev: UiSettings) => UiSettings) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_UI_SETTINGS,
  updateSettings: () => { },
  resetSettings: () => { },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSettings = useCallback((updater: (prev: UiSettings) => UiSettings) => {
    writeRaw(JSON.stringify(updater(getSnapshot())));
  }, []);

  const resetSettings = useCallback(() => {
    writeRaw(JSON.stringify(DEFAULT_UI_SETTINGS));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
