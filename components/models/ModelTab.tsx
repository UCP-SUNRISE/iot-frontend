"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMqtt } from "@/contexts/MqttContext";
import { useConfirm } from "@/contexts/ConfirmDialogContext";
import { useModelRegistry } from "@/hooks/useModelRegistry";
import { activeEntry, bestCandidate, getRecommendations } from "@/lib/modelRecommendations";
import { ModelEntry } from "@/types/models";
import { SessionRow, TrainingModel } from "@/types/session";
import { ModelSummary } from "./ModelSummary";
import { TrainingPanel } from "./TrainingPanel";
import { ModelsTable } from "./ModelsTable";
import { MODEL_DESCRIPTIONS, formatError, errorUnit } from "./format";

export function ModelTab({ model, sessions }: { model: TrainingModel; sessions: SessionRow[] }) {
  const { systemSettings, isConnected } = useMqtt();
  const { confirm } = useConfirm();
  const { registry, error, isLoading, refresh, job, isTraining, isStarting, train, activate } = useModelRegistry(model);
  const hardnessUnit = systemSettings?.training.hardness_unit ?? "g";

  const active = useMemo(() => (registry ? activeEntry(registry) : null), [registry]);
  const best = useMemo(() => (registry ? bestCandidate(registry) : null), [registry]);
  const recommendations = useMemo(
    () => (registry && systemSettings ? getRecommendations(model, registry, sessions, systemSettings.recommendations) : []),
    [model, registry, sessions, systemSettings]
  );

  const confirmActivate = (entry: ModelEntry) => {
    const unit = errorUnit(model, hardnessUnit);
    confirm({
      title: `Activate ${entry.name}?`,
      description:
        `${model === "kinetics" ? "Forecasts" : "Hardness predictions"} will use ${entry.name} from run ${entry.run.run_id} ` +
        `(R² ${entry.metrics.cv_r2.toFixed(3)}, RMSE ${formatError(entry.metrics.cv_rmse, model)} ${unit} on unseen experiments). ` +
        "You can switch back at any time.",
      confirmText: "Activate",
      onConfirm: () => activate(entry.run.run_id, entry.name),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl">{MODEL_DESCRIPTIONS[model]}</p>
        <Button variant="outline" size="sm" onClick={refresh} disabled={!isConnected || isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && !registry && (
        <p className="text-sm text-destructive">Could not load models: {error}</p>
      )}
      {!registry && !error && (
        <p className="text-sm text-muted-foreground">{isConnected ? "Loading models…" : "Connecting to the Edge Server…"}</p>
      )}

      {registry && (
        <>
          <ModelSummary
            model={model}
            registry={registry}
            active={active}
            best={best}
            hardnessUnit={hardnessUnit}
            onActivate={confirmActivate}
          />
          <TrainingPanel
            model={model}
            job={job}
            isTraining={isTraining}
            isStarting={isStarting}
            isConnected={isConnected}
            sessions={sessions}
            includeBaseline={systemSettings?.training.include_baseline ?? true}
            recommendations={recommendations}
            onTrain={train}
            onActivateRecommended={rec => confirmActivate(rec.entry)}
          />
          <ModelsTable model={model} registry={registry} hardnessUnit={hardnessUnit} onActivate={confirmActivate} />
        </>
      )}
    </div>
  );
}
