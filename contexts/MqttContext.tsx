"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import mqtt, { MqttClient } from "mqtt";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { TempHumidityNode, LightNode, DeviceRecord, WeatherReading } from "@/types/telemetry";
import { SystemSettings, SystemSettingsChanges } from "@/types/settings";
import { TrainingJob } from "@/types/models";
import { TrainingModel } from "@/types/session";

// 1. The payload exactly as it comes from the Python ESP32 Simulator
export interface MqttPayload {
  metadata: {
    timestamp_ms: number;
    device_id: string;
  };
  core: {
    water_temp: number;
    food_temp: number;
    pressure: number;
    solar_radiation?: number;
  };
  cube_th: TempHumidityNode[];
  cube_light: LightNode[];
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface ExperimentStatus {
  active: boolean;
  sessionId: string | null;
  startTimestamp: number | null; // Unix ms from retained topic
}

export interface EventLog {
  time: Date;
  message: string;
  type: 'alert' | 'info';
}

// 2. Separate Network State from Telemetry
interface MqttContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  liveData: MqttPayload | null;
  /** Latest weather-station reading; null until a station publishes. */
  weatherData: WeatherReading | null;
  registeredDevices: DeviceRecord[];
  experimentStatus: ExperimentStatus;
  eventLogs: EventLog[];
  dbQueryResponse: object[] | null;
  chartData: any[];
  /** Edge Server settings; null until the retained message arrives. */
  systemSettings: SystemSettings | null;
  updateSystemSettings: (changes: SystemSettingsChanges) => void;
  resetSystemSettings: () => void;
  /** Latest training job per model type (retained, so available even after a page reload). */
  trainingJobs: Partial<Record<TrainingModel, TrainingJob>>;
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  sendCommand: (payload: object) => void;
  queryDb: (query: string, params?: object) => void;
  makeRpcCall: <T = unknown>(requestTopicBase: string, responseTopicBase: string, payload: unknown, options?: RpcOptions) => Promise<T>;
}

export interface RpcOptions {
  /** How long to wait for the response before rejecting. Defaults to 10s. */
  timeoutMs?: number;
}

const DEFAULT_RPC_TIMEOUT_MS = 10000;

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  connectionStatus: 'idle',
  liveData: null,
  weatherData: null,
  registeredDevices: [],
  experimentStatus: { active: false, sessionId: null, startTimestamp: null },
  eventLogs: [],
  dbQueryResponse: null,
  chartData: [],
  systemSettings: null,
  updateSystemSettings: () => { },
  resetSystemSettings: () => { },
  trainingJobs: {},
  publish: () => { },
  subscribe: () => { },
  unsubscribe: () => { },
  sendCommand: () => { },
  queryDb: () => { },
  makeRpcCall: () => Promise.reject(new Error("MQTT client not connected")),
});

export function MqttProvider({ children }: { children: React.ReactNode }) {
  // Split state: One for the UI health indicator, one for the rapidly changing charts
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [liveData, setLiveData] = useState<MqttPayload | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherReading | null>(null);
  const [registeredDevices, setRegisteredDevices] = useState<DeviceRecord[]>([]);
  const [experimentStatus, setExperimentStatus] = useState<ExperimentStatus>({ active: false, sessionId: null, startTimestamp: null });
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [dbQueryResponse, setDbQueryResponse] = useState<object[] | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [trainingJobs, setTrainingJobs] = useState<Partial<Record<TrainingModel, TrainingJob>>>({});

  const appendLog = (message: string, type: EventLog['type'] = 'info') => {
    setEventLogs(prev => [{ time: new Date(), message, type }, ...prev].slice(0, 100));
  };

  const clientRef = useRef<MqttClient | null>(null);
  const isConnected = useMemo(() => connectionStatus === 'connected', [connectionStatus]);

  useEffect(() => {
    let watchdogTimer: NodeJS.Timeout | null = null;

    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };

    const startWatchdog = () => {
      resetWatchdog();
      watchdogTimer = setTimeout(() => {
        setConnectionStatus('offline');
        if (clientRef.current) {
          clientRef.current.end(true);
        }
      }, 5000);
    };

    const host = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "localhost";
    const isRemote = host.includes("localto.net") || host.includes("localtonet.com");

    const protocol = isRemote ? "wss" : "ws";
    const port = isRemote ? 443 : 9001;

    const connectUrl = process.env.NEXT_PUBLIC_MQTT_URL || `${protocol}://${host}:${port}`;

    setConnectionStatus('connecting');
    const client = mqtt.connect(connectUrl, {
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    });
    clientRef.current = client;
    startWatchdog();

    client.on("connect", () => {
      console.log("Connected to MQTT Broker");
      setConnectionStatus('connected');
      resetWatchdog();
      // Subscribe to retained topics — broker delivers the last retained msg immediately
      client.subscribe('sunrise/system/registry', (err) => {
        if (err) console.error('Failed to subscribe to registry', err);
      });
      client.subscribe('sunrise/system/experiment_status', (err) => {
        if (err) console.error('Failed to subscribe to experiment_status', err);
      });
      client.subscribe(['sunrise/system/settings', 'sunrise/system/settings/error'], (err) => {
        if (err) console.error('Failed to subscribe to system settings', err);
      });
      client.subscribe('sunrise/weather/+/live', (err) => {
        if (err) console.error('Failed to subscribe to weather', err);
      });
      client.subscribe('sunrise/ml/train/status/+', (err) => {
        if (err) console.error('Failed to subscribe to training status', err);
      });
      client.subscribe('sunrise/alerts/thermal', (err) => {
        if (err) console.error('Failed to subscribe to thermal alerts', err);
      });
      client.subscribe('sunrise/db/response', (err) => {
        if (err) console.error('Failed to subscribe to db/response', err);
      });
      client.subscribe('sunrise/db/saved_point', (err) => {
        if (err) console.error('Failed to subscribe to db/saved_point', err);
      });
    });

    client.on("reconnect", () => {
      console.log("Reconnecting...");
      setConnectionStatus('reconnecting');
      startWatchdog();
    });

    client.on("offline", () => {
      setConnectionStatus('offline');
      setRegisteredDevices([]);
      setChartData([]);
      setLiveData(null);
      setWeatherData(null);
      resetWatchdog();
    });

    client.on("close", () => {
      setConnectionStatus((prev) => prev === 'error' ? prev : 'offline');
      setRegisteredDevices([]);
      setChartData([]);
      setLiveData(null);
      setWeatherData(null);
      resetWatchdog();
    });

    client.on("error", (err) => {
      console.error("MQTT Connection Error:", err);
      setConnectionStatus('error');
      resetWatchdog();
    });

    client.on("message", (topic, message) => {
      if (topic === 'sunrise/system/registry') {
        try {
          const registry: DeviceRecord[] = JSON.parse(message.toString());
          setRegisteredDevices(registry);
        } catch (err) {
          console.error('Failed to parse registry payload', err);
        }
        return;
      }

      // Must be handled before the generic oven "live" branch below, which matches any topic containing "live"
      if (topic.startsWith('sunrise/weather/') && topic.endsWith('/live')) {
        try {
          setWeatherData(JSON.parse(message.toString()));
        } catch (err) {
          console.error('Failed to parse weather payload', err);
        }
        return;
      }

      if (topic.startsWith('sunrise/ml/train/status/')) {
        try {
          const job: TrainingJob = JSON.parse(message.toString());
          setTrainingJobs(prev => ({ ...prev, [job.model]: job }));
        } catch (err) {
          console.error('Failed to parse training status payload', err);
        }
        return;
      }

      if (topic === 'sunrise/system/settings') {
        try {
          setSystemSettings(JSON.parse(message.toString()));
        } catch (err) {
          console.error('Failed to parse system settings payload', err);
        }
        return;
      }

      if (topic === 'sunrise/system/settings/error') {
        try {
          const { error } = JSON.parse(message.toString());
          toast.error('Settings not saved', { description: error });
        } catch (err) {
          console.error('Failed to parse settings error payload', err);
        }
        return;
      }

      if (topic === 'sunrise/system/experiment_status') {
        try {
          const data = JSON.parse(message.toString());
          setExperimentStatus({
            active: data.active,
            sessionId: data.session_id ?? null,
            startTimestamp: data.start_timestamp ?? null, // Unix ms
          });

          if (!data.active) {
            // Clean slate when experiment terminates
            setChartData([]);
            setLiveData(null);
            setEventLogs([]);
          }

          const logMsg = data.active
            ? `Session started: ${data.session_id}`
            : 'Session stopped.';
          appendLog(logMsg, 'info');
        } catch (err) {
          console.error('Failed to parse experiment_status payload', err);
        }
        return;
      }

      if (topic === 'sunrise/alerts/thermal') {
        try {
          const alert = JSON.parse(message.toString());
          const { type, message: alertMessage, timestamp, elapsed_formatted } = alert;

          const description = `Elapsed: ${elapsed_formatted} | Time: ${new Date(timestamp).toLocaleTimeString()}`;

          if (type === 'target') {
            toast.error(alertMessage, { description, duration: 10000 });
          } else if (type === 'time') {
            toast.warning(alertMessage, { description, duration: Infinity });
          } else if (type === 'sensor_limit') {
            // Hardware protection — stays until dismissed
            toast.error(alertMessage, { description: `Time: ${new Date(timestamp).toLocaleTimeString()}`, duration: Infinity });
          }
          appendLog(`[${type.toUpperCase()}] ${alertMessage} (${elapsed_formatted})`, 'alert');
        } catch (err) {
          console.error('Failed to parse thermal alert payload', err);
        }
        return;
      }

      if (topic === 'sunrise/db/response') {
        try {
          const data = JSON.parse(message.toString());
          if (data.response_to === 'get_live_chart') {
            setChartData(data.data || []);
          } else if (data.response_to === 'delete_session') {
            if (data.success) {
              toast.success(`Session ${data.session_id} deleted successfully.`, { id: `delete-${data.session_id}` });
              // Immediately re-fetch the sessions to update the UI table
              if (clientRef.current && clientRef.current.connected) {
                clientRef.current.publish('sunrise/db/request', JSON.stringify({ query: "get_sessions" }));
              }
            } else {
              toast.error(`Failed to delete session ${data.session_id}.`, { id: `delete-${data.session_id}` });
            }
          } else if (data.response_to === 'update_session_training') {
            if (data.success) {
              toast.success('Training data updated.', { id: `training-${data.session_id}` });
              // Re-fetch so the table shows the updated values and eligibility
              if (clientRef.current && clientRef.current.connected) {
                clientRef.current.publish('sunrise/db/request', JSON.stringify({ query: "get_sessions" }));
              }
            } else {
              toast.error('Training data not saved', { id: `training-${data.session_id}`, description: data.error });
            }
          } else {
            setDbQueryResponse(Array.isArray(data) ? data : [data]);
          }
        } catch (err) {
          console.error('Failed to parse db/response payload', err);
        }
        return;
      }

      if (topic === 'sunrise/db/saved_point') {
        try {
          const point = JSON.parse(message.toString());
          setChartData(prev => {
            const next = [...prev, point];
            if (next.length > 1000) return next.slice(next.length - 1000);
            return next;
          });
        } catch (err) {
          console.error('Failed to parse saved_point payload', err);
        }
        return;
      }

      // Live telemetry — forwarded to chart state
      if (topic.includes("live")) {
        try {
          const payload = JSON.parse(message.toString());
          setLiveData(payload);
        } catch (err) {
          console.error("Failed to parse MQTT message payload", err);
        }
      }
    });

    return () => {
      resetWatchdog();
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, []);

  // Expose safe, memoized functions for child components to interact with the broker
  const publish = useCallback((topic: string, message: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, message);
    } else {
      console.warn("Cannot publish: MQTT client is disconnected.");
    }
  }, []);

  const subscribe = useCallback((topic: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.subscribe(topic, (err) => {
        if (err) console.error(`Failed to subscribe to ${topic}`, err);
      });
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.unsubscribe(topic);
    }
  }, []);

  const sendCommand = useCallback((payload: object) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish('sunrise/system/control', JSON.stringify(payload));
    } else {
      console.warn('Cannot send command: MQTT client is disconnected.');
    }
  }, []);

  const publishSettingsRequest = useCallback((request: object) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish('sunrise/system/settings/set', JSON.stringify(request));
    } else {
      toast.error('Settings not saved', { description: 'Not connected to the Edge Server.' });
    }
  }, []);

  const updateSystemSettings = useCallback(
    (changes: SystemSettingsChanges) => publishSettingsRequest({ changes }),
    [publishSettingsRequest]
  );

  const resetSystemSettings = useCallback(
    () => publishSettingsRequest({ reset: true }),
    [publishSettingsRequest]
  );

  const queryDb = useCallback((query: string, params: object = {}) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish('sunrise/db/request', JSON.stringify({ query, ...params }));
    } else {
      console.warn('Cannot query DB: MQTT client is disconnected.');
    }
  }, []);

  const makeRpcCall = useCallback(<T = unknown,>(
    requestTopicBase: string,
    responseTopicBase: string,
    payload: unknown,
    { timeoutMs = DEFAULT_RPC_TIMEOUT_MS }: RpcOptions = {}
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client || !client.connected) {
        return reject(new Error('MQTT client not connected'));
      }

      const requestUuid = uuidv4();
      const responseTopic = `${responseTopicBase}/${requestUuid}`;
      const requestTopic = `${requestTopicBase}/${requestUuid}`;

      let timeoutId: NodeJS.Timeout;

      const messageHandler = (topic: string, message: Buffer) => {
        if (topic === responseTopic) {
          clearTimeout(timeoutId);
          client.unsubscribe(responseTopic);
          client.removeListener('message', messageHandler);

          let data;
          try {
            data = JSON.parse(message.toString());
          } catch {
            return reject(new Error('Failed to parse MQTT response'));
          }
          // The Edge Server's ML bridge reports failures on the response topic
          // as { error, status: "failed" } — surface them instead of resolving.
          if (data?.status === 'failed') {
            return reject(new Error(data.error || 'Request failed'));
          }
          resolve(data);
        }
      };

      // Subscribe to the response topic
      client.subscribe(responseTopic, (err) => {
        if (err) {
          return reject(err);
        }

        // Add the listener
        client.on('message', messageHandler);

        // Publish the request
        client.publish(requestTopic, JSON.stringify(payload));

        timeoutId = setTimeout(() => {
          client.unsubscribe(responseTopic);
          client.removeListener('message', messageHandler);
          reject(new Error(`No response after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      });
    });
  }, []);

  return (
    <MqttContext.Provider value={{ isConnected, connectionStatus, liveData, weatherData, registeredDevices, experimentStatus, eventLogs, dbQueryResponse, chartData, systemSettings, updateSystemSettings, resetSystemSettings, trainingJobs, publish, subscribe, unsubscribe, sendCommand, queryDb, makeRpcCall }}>
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}