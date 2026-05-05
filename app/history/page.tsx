"use client";

import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { ExperimentHistory } from "@/components/ExperimentHistory";

export default withPageAuthRequired(function HistoryPage() {
  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8 flex-grow flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Experiment Archive</h1>
        <p className="text-muted-foreground mt-2">Review and export data from past sessions.</p>
      </div>
      <ExperimentHistory />
    </main>
  );
});
