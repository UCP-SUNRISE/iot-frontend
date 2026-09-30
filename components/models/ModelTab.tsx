"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMqtt } from "@/contexts/MqttContext";
import { useConfirm } from "@/contexts/ConfirmDialogContext";
import { useModelRegistry } from "@/hooks/useModelRegistry";
import { exportAllRuns, exportTrainingRun } from "@/lib/exportModelRun";
import { activeEntry, bestCandidate, getRecommendations } from "@/lib/modelRecommendations";
import { ModelEntry, TrainingRun } from "@/types/models";
import { SessionRow, TrainingModel } from "@/types/session";
import { ModelSummary } from "./ModelSummary";
import { TrainingPanel } from "./TrainingPanel";
import { TrainDialog } from "./TrainDialog";
import { ModelsTable } from "./ModelsTable";
import { RunDetailsDialog } from "./RunDetailsDialog";
import { MODEL_DESCRIPTIONS, formatError, errorUnit } from "./format";

export function ModelTab({ model, sessions }: { model: TrainingModel; sessions: SessionRow[] }) {
  const { systemSettings, isConnected } = useMqtt();
  const { confirm } = useConfirm();
  const {
    registry, candidates, error, isLoading, refresh, job, isTraining, isStarting,
    train, cancel, activate, loadRun, annotate, remove,
  } = useModelRegistry(model);
  const [trainOpen, setTrainOpen] = useState(false);
  const [detailsRunId, setDetailsRunId] = useState<string | null>(null);

  const hardnessUnit = systemSettings?.training.hardness_unit ?? "g";
  const unit = errorUnit(model, hardnessUnit);
  const includeBaseline = systemSettings?.training.include_baseline ?? true;
  const eligibleSessions = sessions.filter(s => s.training_eligibility[model].eligible).length;
  const blockedSessions = sessions.filter(s => !s.is_active && !s.training_eligibility[model].eligible).length;

  const active = useMemo(() => (registry ? activeEntry(registry) : null), [registry]);
  const best = useMemo(() => (registry ? bestCandidate(registry) : null), [registry]);
  const recommendations = useMemo(
    () => (registry && systemSettings ? getRecommendations(model, registry, sessions, systemSettings.recommendations) : []),
    [model, registry, sessions, systemSettings]
  );
  // Looked up from the registry so the dialog shows fresh label/notes after a save
  const detailsRun = registry?.runs.find(r => r.run_id === detailsRunId) ?? null;
  // Time estimate in the train dialog: the latest run made without tuning
  const referenceRun = registry?.runs.find(r => !r.tuned && r.duration_seconds != null);

  const confirmActivate = (entry: ModelEntry) => {
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

  const confirmDelete = (run: TrainingRun) => {
    confirm({
      title: "Delete training run?",
      description:
        `Run ${run.run_id}${run.label ? ` (${run.label})` : ""} and its ${Object.keys(run.metrics).length} trained model(s) ` +
        "will be removed permanently, including its training record. Export it first if you may need it for a publication.",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: () => remove(run.run_id),
    });
  };

  const confirmCancel = () => {
    confirm({
      title: "Cancel training?",
      description: "The run stops at the end of the current validation step and nothing is saved.",
      confirmText: "Cancel training",
      cancelText: "Keep training",
      isDestructive: true,
      onConfirm: cancel,
    });
  };

  const exportRun = async (run: TrainingRun) => {
    const toastId = toast.loading(`Preparing ${run.run_id}…`);
    try {
      exportTrainingRun(await loadRun(run.run_id, true), unit);
      toast.success("Export ready", { id: toastId });
    } catch (e) {
      toast.error("Export failed", { id: toastId, description: e instanceof Error ? e.message : undefined });
    }
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
            job={job}
            isTraining={isTraining}
            isStarting={isStarting}
            isConnected={isConnected}
            eligibleSessions={eligibleSessions}
            blockedSessions={blockedSessions}
            includeBaseline={includeBaseline}
            recommendations={recommendations}
            onTrain={() => setTrainOpen(true)}
            onCancel={confirmCancel}
            onActivateRecommended={rec => confirmActivate(rec.entry)}
          />
          <ModelsTable
            model={model}
            registry={registry}
            hardnessUnit={hardnessUnit}
            onActivate={confirmActivate}
            onDetails={run => setDetailsRunId(run.run_id)}
            onExportRun={exportRun}
            onExportAll={() => exportAllRuns(registry, unit)}
            onDelete={confirmDelete}
          />
        </>
      )}

      <TrainDialog
        open={trainOpen}
        onOpenChange={setTrainOpen}
        model={model}
        candidates={candidates}
        eligibleSessions={eligibleSessions}
        includeBaseline={includeBaseline}
        referenceRun={referenceRun}
        isStarting={isStarting}
        onStart={train}
      />
      <RunDetailsDialog
        run={detailsRun}
        errorUnit={unit}
        onOpenChange={open => !open && setDetailsRunId(null)}
        loadRun={loadRun}
        annotate={annotate}
      />
    </div>
  );
}
