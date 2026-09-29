"use client";

import { useEffect, useState } from "react";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { useMqtt } from "@/contexts/MqttContext";
import { ModelTab } from "@/components/models/ModelTab";
import { MODEL_TITLES } from "@/components/models/format";
import { isSessionList } from "@/lib/sessions";
import { SessionRow, TrainingModel } from "@/types/session";
import { cn } from "@/lib/utils";

const TABS: TrainingModel[] = ["kinetics", "hardness"];

export default withPageAuthRequired(function ModelsPage() {
  const { queryDb, dbQueryResponse, isConnected, trainingJobs } = useMqtt();
  const [tab, setTab] = useState<TrainingModel>("kinetics");
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Sessions drive eligibility counts and retrain recommendations
  useEffect(() => {
    if (isConnected) queryDb("get_sessions");
  }, [isConnected, queryDb]);

  useEffect(() => {
    if (dbQueryResponse && Array.isArray(dbQueryResponse) && isSessionList(dbQueryResponse)) {
      setSessions(dbQueryResponse);
    }
  }, [dbQueryResponse]);

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground">
          Train models on recorded sessions, compare them, and choose which one the predictions use.
        </p>
      </div>

      <div role="tablist" aria-label="Model type" className="inline-flex rounded-lg border p-1 gap-1">
        {TABS.map(t => {
          const running = trainingJobs[t]?.status === "running" || trainingJobs[t]?.status === "queued";
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {MODEL_TITLES[t]}
              {running && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-label="training" />}
            </button>
          );
        })}
      </div>

      {/* Keyed so switching tabs remounts and loads that model's registry fresh */}
      <ModelTab key={tab} model={tab} sessions={sessions} />
    </main>
  );
});
