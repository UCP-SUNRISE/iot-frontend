import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { toast } from "sonner";
import { useMqtt } from "@/contexts/MqttContext";
import { ModelCandidate, ModelRegistry, TrainOptions, TrainingJob, TrainingRunDetail } from "@/types/models";
import { TrainingModel } from "@/types/session";

const MODELS_TIMEOUT_MS = 15000;
// A run's full record with predictions is the largest response (hundreds of kB)
const RUN_DETAIL_TIMEOUT_MS = 45000;

const errorText = (e: unknown) => (e instanceof Error ? e.message : undefined);

/**
 * Model registry for one model type: training runs, the active model, the model library,
 * the live training job, and the actions on them (all over the Edge Server's ML bridge).
 */
export function useModelRegistry(model: TrainingModel) {
  const { makeRpcCall, isConnected, trainingJobs } = useMqtt();
  const { user } = useUser();
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [candidates, setCandidates] = useState<ModelCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Async transition: React tracks the pending state, so no setState runs synchronously in effects
  const [isLoading, startLoading] = useTransition();
  const [isStarting, setIsStarting] = useState(false);
  const job: TrainingJob | undefined = trainingJobs[model];
  const isTraining = job?.status === "queued" || job?.status === "running";
  const userName = user?.name ?? user?.email ?? null;

  const call = useCallback(
    <T,>(topic: string, payload: object, timeoutMs = MODELS_TIMEOUT_MS) =>
      makeRpcCall<T>(`sunrise/ml/${topic}/request`, `sunrise/ml/${topic}/response`, { model, user: userName, ...payload }, { timeoutMs }),
    [makeRpcCall, model, userName]
  );

  const refresh = useCallback(() => {
    startLoading(async () => {
      try {
        setRegistry(await call<ModelRegistry>("models", {}));
        setError(null);
      } catch (e) {
        setError(errorText(e) ?? "Failed to load models");
      }
    });
  }, [call]);

  useEffect(() => {
    if (!isConnected) return;
    refresh();
    // The library only changes with a new service version, so it is loaded once per visit
    call<{ candidates: ModelCandidate[] }>("candidates", {})
      .then(response => setCandidates(response.candidates))
      .catch(e => console.error("Failed to load the model library", e));
  }, [isConnected, refresh, call]);

  // Notify and reload when a job seen running during this visit finishes. A job that
  // had already finished before the page opened (retained status) is ignored.
  const seenRunning = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!job) return;
    if (job.status === "queued" || job.status === "running") {
      seenRunning.current.add(job.job_id);
      return;
    }
    if (!seenRunning.current.delete(job.job_id)) return;
    if (job.status === "completed") {
      toast.success(`${model === "kinetics" ? "Kinetics" : "Hardness"} training finished`, {
        description: `Recommended: ${job.result?.recommended_model ?? "—"}. Review it before activating.`,
      });
      refresh();
    } else if (job.status === "cancelled") {
      toast.info("Training cancelled", { description: "No run was saved." });
    } else {
      toast.error("Training failed", { description: job.error ?? undefined });
    }
  }, [job, model, refresh]);

  const train = useCallback(async (options: TrainOptions) => {
    setIsStarting(true);
    try {
      const started = await call<TrainingJob>("train", {
        candidates: options.candidates ?? null, tune: options.tune, label: options.label || null,
      }, 45000);
      // A very short job may finish before its first "running" status arrives
      seenRunning.current.add(started.job_id);
      toast.info("Training started", { description: "Progress is shown below; you can leave this page." });
      return true;
    } catch (e) {
      toast.error("Could not start training", { description: errorText(e) });
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [call]);

  const cancel = useCallback(async () => {
    if (!job) return;
    try {
      await call("train/cancel", { job_id: job.job_id });
      toast.info("Cancelling…", { description: "Training stops at the end of the current validation step." });
    } catch (e) {
      toast.error("Could not cancel training", { description: errorText(e) });
    }
  }, [call, job]);

  const activate = useCallback(async (runId: string, modelName: string) => {
    try {
      await call("models/activate", { run_id: runId, model_name: modelName });
      toast.success(`${modelName} is now the active ${model} model`);
      refresh();
    } catch (e) {
      toast.error("Activation failed", { description: errorText(e) });
    }
  }, [call, model, refresh]);

  /** The full record of a run; pass `predictions` to include every out-of-fold prediction. */
  const loadRun = useCallback(
    (runId: string, predictions: boolean) =>
      call<TrainingRunDetail>("runs/detail", { run_id: runId, predictions }, RUN_DETAIL_TIMEOUT_MS),
    [call]
  );

  const annotate = useCallback(async (runId: string, label: string, notes: string) => {
    try {
      await call("runs/annotate", { run_id: runId, label, notes });
      toast.success("Run notes saved");
      refresh();
      return true;
    } catch (e) {
      toast.error("Notes not saved", { description: errorText(e) });
      return false;
    }
  }, [call, refresh]);

  const remove = useCallback(async (runId: string) => {
    try {
      await call("runs/delete", { run_id: runId });
      toast.success(`Run ${runId} deleted`);
      refresh();
    } catch (e) {
      toast.error("Run not deleted", { description: errorText(e) });
    }
  }, [call, refresh]);

  return {
    registry, candidates, error, isLoading, refresh, job, isTraining, isStarting,
    train, cancel, activate, loadRun, annotate, remove,
  };
}
