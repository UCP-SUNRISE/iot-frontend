"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
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

// 2. Separate Network State from Telemetry
interface MqttContextType {
  isConnected: boolean;
  liveData: MqttPayload | null;
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  liveData: null,
  publish: () => { },
  subscribe: () => { },
  unsubscribe: () => { },
});

export function MqttProvider({ children }: { children: React.ReactNode }) {
  // Split state: One for the UI health indicator, one for the rapidly changing charts
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<MqttPayload | null>(null);

  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || "ws://localhost:9001";
    const client = mqtt.connect(brokerUrl);
    clientRef.current = client;

    client.on("connect", () => {
      console.log("Connected to MQTT Broker");
      setIsConnected(true);
    });

    client.on("reconnect", () => console.log("Reconnecting..."));
    client.on("offline", () => setIsConnected(false));
    client.on("close", () => setIsConnected(false));
    client.on("error", (err) => {
      console.error("MQTT Connection Error:", err);
      setIsConnected(false);
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
      if (clientRef.current) {
        clientRef.current.end();
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
    <MqttContext.Provider value={{ isConnected, liveData, publish, subscribe, unsubscribe }}>
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}