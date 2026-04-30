"use client";

import { useState, useTransition } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMqtt } from "@/contexts/MqttContext";
import { PreExperimentDialog } from "./PreExperimentDialog";

export function ExperimentControls() {
  const { user, isLoading } = useUser();
  const { isConnected, experimentStatus, sendCommand, connectionStatus } = useMqtt();
  const [sessionName, setSessionName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleStartTransition = () => {
    startTransition(() => {
      // The actual sendCommand is now handled by PreExperimentDialog,
      // but we wrap it in a transition to show the pending state.
    });
  };

  const handleStop = () => {
    startTransition(() => {
      sendCommand({ action: "stop" });
    });
  };

  // --- Auth guard ---
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experiment Control</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experiment Control</CardTitle>
          <CardDescription>Authentication required to control experiments.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/auth/login" className="inline-block">
            <Button variant="outline">Sign In to Control Experiment</Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  // --- Authenticated view ---
  const isDisabled = !isConnected || isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Experiment Control</CardTitle>
          <CardDescription className="mt-1">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </div>
        <Badge
          variant={experimentStatus.active ? "default" : "secondary"}
          className={experimentStatus.active ? "bg-green-600 text-white" : ""}
        >
          {experimentStatus.active ? "Active" : "Idle"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {experimentStatus.active ? (
          <>
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Session ID: </span>
              <span className="font-mono font-medium">{experimentStatus.sessionId}</span>
            </div>
            <Button
              id="stop-experiment-btn"
              variant="destructive"
              className="w-full"
              disabled={isDisabled}
              onClick={handleStop}
            >
              {isPending ? "Stopping..." : "Stop Experiment"}
            </Button>
          </>
        ) : (
          <PreExperimentDialog
            isDisabled={isDisabled}
            isPending={isPending}
            onStart={handleStartTransition}
          />
        )}

        {!isConnected && (
          <p className="text-xs text-destructive">
            Disconnected from broker — controls unavailable. {connectionStatus === "reconnecting" && "(Reconnecting to broker...)"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
