import { ModelEntry, ModelRegistry, flattenRuns } from "@/types/models";
import { SessionRow, TrainingModel } from "@/types/session";
import { SystemSettings } from "@/types/settings";

export type Recommendation =
  | { kind: "train_first"; message: string }
  | { kind: "retrain"; message: string; newSessions: string[] }
  | { kind: "activate"; message: string; entry: ModelEntry };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Physically plausible (kinetics) candidates only; hardness models have no physics check. */
function isPlausible(entry: ModelEntry): boolean {
  return entry.metrics.physics_ok !== false;
}

/**
 * The best trained candidate: lowest out-of-experiment RMSE among plausible models,
 * ties broken by composite score.
 */
export function bestCandidate(registry: ModelRegistry): ModelEntry | null {
  const entries = flattenRuns(registry.runs).filter(isPlausible);
  if (entries.length === 0) return null;
  return entries.reduce((best, e) =>
    e.metrics.cv_rmse < best.metrics.cv_rmse ||
    (e.metrics.cv_rmse === best.metrics.cv_rmse && e.metrics.composite_score > best.metrics.composite_score)
      ? e : best
  );
}

export function activeEntry(registry: ModelRegistry): ModelEntry | null {
  const { active } = registry;
  if (!active) return null;
  const run = registry.runs.find(r => r.run_id === active.run_id);
  const metrics = run?.metrics[active.model_name];
  return run && metrics ? { run, name: active.model_name, metrics } : null;
}

/**
 * Suggestions shown on the Models page. They only ever suggest: training and
 * activation always need an explicit click.
 */
export function getRecommendations(
  model: TrainingModel,
  registry: ModelRegistry,
  sessions: SessionRow[],
  settings: SystemSettings["recommendations"],
  now: number = Date.now(),
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const latest = registry.runs[0];
  const eligible = sessions.filter(s => s.training_eligibility[model].eligible).map(s => s.session_id);

  if (!latest) {
    recommendations.push({
      kind: "train_first",
      message: eligible.length > 0
        ? `No validated model yet. ${eligible.length} eligible session(s) are ready — train a first model.`
        : "No validated model yet. Train a first model on the historical datasets.",
    });
    return recommendations;
  }

  const trained = new Set(latest.data.session_ids);
  const newSessions = eligible.filter(id => !trained.has(id));
  const ageDays = (now - new Date(latest.created_at).getTime()) / DAY_MS;
  if (newSessions.length >= settings.retrain_min_new_sessions) {
    recommendations.push({
      kind: "retrain",
      message: `${newSessions.length} eligible session(s) are not in the latest training run.`,
      newSessions,
    });
  } else if (newSessions.length > 0 && ageDays >= settings.retrain_max_age_days) {
    recommendations.push({
      kind: "retrain",
      message: `The latest run is ${Math.floor(ageDays)} days old and ${newSessions.length} new eligible session(s) exist.`,
      newSessions,
    });
  }

  const best = bestCandidate(registry);
  const current = activeEntry(registry);
  if (best && (!current || best.run.run_id !== current.run.run_id || best.name !== current.name)) {
    if (!current) {
      recommendations.push({
        kind: "activate",
        message: `Forecasts use the legacy model, which has no leave-one-experiment-out metrics. ${best.name} is the best validated model.`,
        entry: best,
      });
    } else {
      const improvement = 1 - best.metrics.cv_rmse / current.metrics.cv_rmse;
      if (improvement >= settings.promote_min_improvement) {
        recommendations.push({
          kind: "activate",
          message: `${best.name} has ${(improvement * 100).toFixed(0)}% lower RMSE on unseen experiments than the active model.`,
          entry: best,
        });
      }
    }
  }
  return recommendations;
}
