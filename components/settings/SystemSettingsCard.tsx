"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useMqtt } from "@/contexts/MqttContext";
import { useConfirm } from "@/contexts/ConfirmDialogContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SystemSettings, HARDNESS_UNITS, HardnessUnit } from "@/types/settings";

/**
 * Settings stored on the Edge Server and shared by every client.
 * Edits are kept as a local draft and only sent on Save; the server validates
 * them and re-broadcasts, which remounts the form with the confirmed values.
 */
export function SystemSettingsCard() {
  const { systemSettings, isConnected } = useMqtt();

  if (!systemSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>
            {isConnected ? "Loading settings from the Edge Server..." : "Connect to the Edge Server to edit shared settings."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Remount on every broadcast so the draft starts from the server's confirmed values.
  return <SystemSettingsForm key={JSON.stringify(systemSettings)} initial={systemSettings} />;
}

function NumberRow({ label, hint, value, onChange, unit, min, max, step = 1, disabled }: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Input
          type="number"
          className="w-24 text-right tabular-nums"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(e.target.valueAsNumber)}
          aria-label={label}
        />
        <span className="text-xs text-muted-foreground w-8">{unit}</span>
      </div>
    </div>
  );
}

function SystemSettingsForm({ initial }: { initial: SystemSettings }) {
  const { updateSystemSettings, resetSystemSettings } = useMqtt();
  const { confirm } = useConfirm();
  const [draft, setDraft] = useState<SystemSettings>(initial);

  const limits = draft.sensor_limits;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const hasInvalid = [
    limits.warn_fraction, limits.cooldown_minutes, limits.sht30_max_temp,
    limits.bpw34_max_temp, draft.telemetry.poll_interval_seconds, draft.weather.max_age_seconds,
    draft.training.min_telemetry_points, draft.training.min_weather_coverage,
  ].some(v => !Number.isFinite(v));

  const setTraining = <K extends keyof SystemSettings["training"]>(key: K, value: SystemSettings["training"][K]) =>
    setDraft(prev => ({ ...prev, training: { ...prev.training, [key]: value } }));

  const setLimit = <K extends keyof SystemSettings["sensor_limits"]>(key: K, value: SystemSettings["sensor_limits"][K]) =>
    setDraft(prev => ({ ...prev, sensor_limits: { ...prev.sensor_limits, [key]: value } }));

  const handleReset = () =>
    confirm({
      title: "Reset shared settings?",
      description: "This restores the default sensor limits, telemetry, weather and training rules for every user.",
      confirmText: "Reset",
      isDestructive: true,
      onConfirm: resetSystemSettings,
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Sensor Protection</CardTitle>
          <Badge variant="outline">Shared</Badge>
        </div>
        <CardDescription>
          Warns when cube sensors approach their rated temperature. Checked continuously, even when no experiment is running.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Enable sensor limit alerts</div>
            <div className="text-xs text-muted-foreground">Uses the hottest cube node reading</div>
          </div>
          <Switch
            checked={limits.enabled}
            onCheckedChange={checked => setLimit("enabled", checked)}
            aria-label="Enable sensor limit alerts"
          />
        </label>
        <NumberRow
          label="Warn at"
          hint="Percentage of the rated maximum that triggers the alert"
          value={Math.round(limits.warn_fraction * 100)}
          onChange={v => setLimit("warn_fraction", v / 100)}
          unit="%" min={10} max={100}
          disabled={!limits.enabled}
        />
        <NumberRow
          label="SHT30 rated maximum"
          hint="Temperature/humidity sensor"
          value={limits.sht30_max_temp}
          onChange={v => setLimit("sht30_max_temp", v)}
          unit="°C" min={0} max={200}
          disabled={!limits.enabled}
        />
        <NumberRow
          label="BPW34 rated maximum"
          hint="Light photodiode (uses the co-located SHT30 reading)"
          value={limits.bpw34_max_temp}
          onChange={v => setLimit("bpw34_max_temp", v)}
          unit="°C" min={0} max={200}
          disabled={!limits.enabled}
        />
        <NumberRow
          label="Repeat alert after"
          hint="Minimum time between alerts for the same sensor and oven"
          value={limits.cooldown_minutes}
          onChange={v => setLimit("cooldown_minutes", v)}
          unit="min" min={0} max={120}
          disabled={!limits.enabled}
        />
      </CardContent>

      <CardHeader className="pt-2">
        <div className="flex items-center gap-2">
          <CardTitle>Telemetry</CardTitle>
          <Badge variant="outline">Shared</Badge>
        </div>
        <CardDescription>How often ovens are polled for persisted data during an experiment.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <NumberRow
          label="Poll interval"
          hint="Takes effect from the next poll cycle"
          value={draft.telemetry.poll_interval_seconds}
          onChange={v => setDraft(prev => ({ ...prev, telemetry: { poll_interval_seconds: v } }))}
          unit="s" min={5} max={3600}
        />
        <NumberRow
          label="Weather reading max age"
          hint="Older weather-station readings are not saved with telemetry"
          value={draft.weather.max_age_seconds}
          onChange={v => setDraft(prev => ({ ...prev, weather: { max_age_seconds: v } }))}
          unit="s" min={10} max={3600}
        />
      </CardContent>

      <CardHeader className="pt-2">
        <div className="flex items-center gap-2">
          <CardTitle>Training Data</CardTitle>
          <Badge variant="outline">Shared</Badge>
        </div>
        <CardDescription>
          Rules for which sessions can be selected for model training. A session must be stopped, selected in History and have a final hardness recorded for the hardness model.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Require final hardness for the kinetics model</div>
            <div className="text-xs text-muted-foreground">The kinetics model itself only needs temperature and weather data</div>
          </div>
          <Switch
            checked={draft.training.kinetics_requires_hardness}
            onCheckedChange={checked => setTraining("kinetics_requires_hardness", checked)}
            aria-label="Require final hardness for the kinetics model"
          />
        </label>
        <NumberRow
          label="Minimum telemetry points"
          hint="Sessions with fewer persisted readings are excluded"
          value={draft.training.min_telemetry_points}
          onChange={v => setTraining("min_telemetry_points", v)}
          unit="pts" min={1} max={100000}
        />
        <NumberRow
          label="Minimum weather coverage"
          hint="Share of readings that must include ambient data (kinetics model)"
          value={Math.round(draft.training.min_weather_coverage * 100)}
          onChange={v => setTraining("min_weather_coverage", v / 100)}
          unit="%" min={0} max={100}
        />
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Hardness unit</div>
            <div className="text-xs text-muted-foreground">Unit of the TPA hardness values entered in History</div>
          </div>
          <Select value={draft.training.hardness_unit} onValueChange={v => setTraining("hardness_unit", v as HardnessUnit)}>
            <SelectTrigger className="w-24" aria-label="Hardness unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HARDNESS_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={handleReset}>Reset shared settings</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!isDirty} onClick={() => setDraft(initial)}>Discard</Button>
          <Button size="sm" disabled={!isDirty || hasInvalid} onClick={() => updateSystemSettings(draft)}>Save</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
