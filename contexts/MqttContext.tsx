"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import mqtt, { MqttClient } from "mqtt";

// 1. The payload exactly as it comes from the Python ESP32 Simulator
export interface MqttPayload {
  metadata: {
    timestamp: string;
    device_id: string;
  };
  core: {
    water_temp: number;
    food_temp: number;
    pressure: number;
  };
  cube_th: Array<{ t: number; h: number }>;
  cube_light: number[];
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

// 2. Separate Network State from Telemetry
interface MqttContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  liveData: MqttPayload | null;
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  connectionStatus: 'idle',
  liveData: null,
  publish: () => { },
  subscribe: () => { },
  unsubscribe: () => { },
});

export function MqttProvider({ children }: { children: React.ReactNode }) {
  // Split state: One for the UI health indicator, one for the rapidly changing charts
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [liveData, setLiveData] = useState<MqttPayload | null>(null);

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
      }, 10000);
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
      // Global message handler. We filter by 'live' to update the chart state.
      // Other components can subscribe to different topics and handle their own logic.
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

  return (
    <MqttContext.Provider value={{ isConnected, connectionStatus, liveData, publish, subscribe, unsubscribe }}>
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}