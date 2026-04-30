"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import mqtt, { MqttClient } from "mqtt";
import { toast } from "sonner";
import { TempHumidityNode, LightNode, DeviceRecord } from "@/types/telemetry";

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
  registeredDevices: DeviceRecord[];
  experimentStatus: ExperimentStatus;
  eventLogs: EventLog[];
  dbQueryResponse: object[] | null;
  chartData: any[];
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  sendCommand: (payload: object) => void;
  queryDb: (query: string, params?: object) => void;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  connectionStatus: 'idle',
  liveData: null,
  registeredDevices: [],
  experimentStatus: { active: false, sessionId: null, startTimestamp: null },
  eventLogs: [],
  dbQueryResponse: null,
  chartData: [],
  publish: () => { },
  subscribe: () => { },
  unsubscribe: () => { },
  sendCommand: () => { },
  queryDb: () => { },
});

export function MqttProvider({ children }: { children: React.ReactNode }) {
  // Split state: One for the UI health indicator, one for the rapidly changing charts
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [liveData, setLiveData] = useState<MqttPayload | null>(null);
  const [registeredDevices, setRegisteredDevices] = useState<DeviceRecord[]>([]);
  const [experimentStatus, setExperimentStatus] = useState<ExperimentStatus>({ active: false, sessionId: null, startTimestamp: null });
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [dbQueryResponse, setDbQueryResponse] = useState<object[] | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

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

    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || "ws://localhost:9001";
    setConnectionStatus('connecting');
    const client = mqtt.connect(brokerUrl);
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
      resetWatchdog();
    });

    client.on("close", () => {
      setConnectionStatus((prev) => prev === 'error' ? prev : 'offline');
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

      if (topic === 'sunrise/system/experiment_status') {
        try {
          const data = JSON.parse(message.toString());
          setExperimentStatus({
            active: data.active,
            sessionId: data.session_id ?? null,
            startTimestamp: data.start_timestamp ?? null, // Unix ms
          });
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

  const queryDb = useCallback((query: string, params: object = {}) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish('sunrise/db/request', JSON.stringify({ query, ...params }));
    } else {
      console.warn('Cannot query DB: MQTT client is disconnected.');
    }
  }, []);

  return (
    <MqttContext.Provider value={{ isConnected, connectionStatus, liveData, registeredDevices, experimentStatus, eventLogs, dbQueryResponse, chartData, publish, subscribe, unsubscribe, sendCommand, queryDb }}>
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}