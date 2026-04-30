"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMqtt } from "@/contexts/MqttContext";
import { useUser } from "@auth0/nextjs-auth0/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  name: string;
  waterTarget: number;
  foodTarget: number;
  cooldown: number;
  logFrequency: string;
  maxDuration: number;
}

interface PreExperimentDialogProps {
  isDisabled: boolean;
  isPending: boolean;
  onStart: () => void;
}

export function PreExperimentDialog({ isDisabled, isPending, onStart }: PreExperimentDialogProps) {
  const [open, setOpen] = useState(false);
  const { sendCommand } = useMqtt();
  const { user } = useUser();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: "",
      waterTarget: 70,
      foodTarget: 70,
      cooldown: 5,
      logFrequency: "1m",
      maxDuration: 300,
    }
  });

  const onSubmit = (data: FormData) => {
    onStart(); // Trigger the pending state transition
    sendCommand({
      action: "start",
      operator: user?.email ?? "unknown",
      ...data,
      waterTarget: Number(data.waterTarget),
      foodTarget: Number(data.foodTarget),
      cooldown: Number(data.cooldown),
      maxDuration: Number(data.maxDuration),
    });
    toast.success("Command Sent", {
      description: `Experiment '${data.name}' initialization requested.`
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="start-experiment-btn"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isDisabled}
        >
          {isPending ? "Starting..." : "Start Experiment"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Experiment</DialogTitle>
          <DialogDescription>
            Set the target thresholds and logging parameters before starting the session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Experiment Name</label>
            <Input
              placeholder="e.g. run_01"
              {...register("name", { required: true, minLength: 3 })}
            />
            {errors.name && <p className="text-xs text-red-500">Name is required and must be at least 3 chars.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Water Target (°C)</label>
              <Input
                type="number"
                {...register("waterTarget", { required: true, min: 0, max: 150 })}
              />
              {errors.waterTarget && <p className="text-xs text-red-500">Must be 0-150.</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Food Target (°C)</label>
              <Input
                type="number"
                {...register("foodTarget", { required: true, min: 0, max: 150 })}
              />
              {errors.foodTarget && <p className="text-xs text-red-500">Must be 0-150.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cooldown (mins)</label>
              <Input
                type="number"
                {...register("cooldown", { required: true, min: 0 })}
              />
              {errors.cooldown && <p className="text-xs text-red-500">Invalid cooldown.</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Duration (mins)</label>
              <Input
                type="number"
                {...register("maxDuration", { required: true, min: 1 })}
              />
              {errors.maxDuration && <p className="text-xs text-red-500">Must be &gt; 0.</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Log Frequency</label>
            <Controller
              name="logFrequency"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30s">30 Seconds</SelectItem>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="2m">2 Minutes</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Initialize & Start</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
