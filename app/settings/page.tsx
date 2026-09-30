"use client";

import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettings, SpatialMetric } from "@/contexts/SettingsContext";
import { SystemSettingsCard } from "@/components/settings/SystemSettingsCard";
import { CookedThresholdInput } from "@/components/predictions/CookedThresholdInput";

const SPATIAL_METRICS: { key: SpatialMetric; label: string; hint: string }[] = [
  { key: "temperature", label: "Temperature", hint: "SHT30 air temperature per cube node" },
  { key: "humidity", label: "Humidity", hint: "SHT30 relative humidity per cube node" },
  { key: "light", label: "Light", hint: "Photodiode illuminance per cube node" },
];

function SettingRow({ label, hint, checked, onChange, disabled }: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </label>
  );
}

export default withPageAuthRequired(function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { spatial } = settings;

  const setSpatialVisible = (visible: boolean) =>
    updateSettings(prev => ({ ...prev, spatial: { ...prev.spatial, visible } }));

  const setMetric = (metric: SpatialMetric, enabled: boolean) =>
    updateSettings(prev => ({
      ...prev,
      spatial: { ...prev.spatial, metrics: { ...prev.spatial.metrics, [metric]: enabled } },
    }));

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Shared settings are stored on the Edge Server and apply to everyone. Display preferences only affect this browser.
        </p>
      </div>

      <SystemSettingsCard />

      <div className="flex items-end justify-between gap-4 pt-4">
        <h2 className="text-lg font-semibold tracking-tight">Display (this browser)</h2>
        <Button variant="outline" size="sm" onClick={resetSettings}>Reset display</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spatial Mapping</CardTitle>
          <CardDescription>
            Exploratory 3D view of the sensor cubes. Ovens without cube sensors simply send no cube data.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            label="Show sensor cubes"
            hint="Display the cube panels on the dashboard and in experiment history"
            checked={spatial.visible}
            onChange={setSpatialVisible}
          />
          {SPATIAL_METRICS.map(({ key, label, hint }) => (
            <SettingRow
              key={key}
              label={label}
              hint={hint}
              checked={spatial.metrics[key]}
              onChange={enabled => setMetric(key, enabled)}
              disabled={!spatial.visible}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hardness forecast</CardTitle>
          <CardDescription>
            Decides when the predictions page marks chickpeas as cooked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="settings-cooked-threshold" className="flex items-center justify-between gap-4 py-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Cooked threshold (chickpea)</div>
              <div className="text-xs text-muted-foreground">Predicted hardness at or below this value counts as cooked</div>
            </div>
            <CookedThresholdInput id="settings-cooked-threshold" />
          </label>
        </CardContent>
      </Card>
    </main>
  );
});
