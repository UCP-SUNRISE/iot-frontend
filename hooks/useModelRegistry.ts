import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { toast } from "sonner";
import { useMqtt } from "@/contexts/MqttContext";
import { ModelRegistry, TrainingJob } from "@/types/models";
import { TrainingModel } from "@/types/session";

const MODELS_TIMEOUT_MS = 15000;

/**
 * Model registry for one model type: the list of training runs, the active model,
 * the live training job, and train/activate actions (all over the Edge Server's ML bridge).
 */
export function useModelRegistry(model: TrainingModel) {
  const { makeRpcCall, isConnected, trainingJobs } = useMqtt();
  const { user } = useUser();
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Async transition: React tracks the pending state, so no setState runs synchronously in effects
  const [isLoading, startLoading] = useTransition();
  const [isStarting, setIsStarting] = useState(false);
  const job: TrainingJob | undefined = trainingJobs[model];
  const isTraining = job?.status === "queued" || job?.status === "running";
  const userName = user?.name ?? user?.email ?? null;

  const refresh = useCallback(() => {
    startLoading(async () => {
      try {
        const response = await makeRpcCall<ModelRegistry>(
          "sunrise/ml/models/request", "sunrise/ml/models/response", { model }, { timeoutMs: MODELS_TIMEOUT_MS }
        );
        setRegistry(response);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load models");
      }
    });
  }, [makeRpcCall, model]);

  useEffect(() => {
    if (isConnected) refresh();
  }, [isConnected, refresh]);

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
    } else {
      toast.error("Training failed", { description: job.error ?? undefined });
    }
  }, [job, model, refresh]);

  const train = useCallback(async () => {
    setIsStarting(true);
    try {
      const started = await makeRpcCall<TrainingJob>(
        "sunrise/ml/train/request", "sunrise/ml/train/response", { model, user: userName }, { timeoutMs: 45000 }
      );
      // A very short job may finish before its first "running" status arrives
      seenRunning.current.add(started.job_id);
      toast.info("Training started", { description: "Progress is shown below; you can leave this page." });
    } catch (e) {
      toast.error("Could not start training", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setIsStarting(false);
    }
  }, [makeRpcCall, model, userName]);

  const activate = useCallback(async (runId: string, modelName: string) => {
    try {
      await makeRpcCall(
        "sunrise/ml/models/activate/request", "sunrise/ml/models/activate/response",
        { model, run_id: runId, model_name: modelName, user: userName }, { timeoutMs: MODELS_TIMEOUT_MS }
      );
      toast.success(`${modelName} is now the active ${model} model`);
      refresh();
    } catch (e) {
      toast.error("Activation failed", { description: e instanceof Error ? e.message : undefined });
    }
  }, [makeRpcCall, model, refresh, userName]);

  return { registry, error, isLoading, refresh, job, isTraining, isStarting, train, activate };
}
