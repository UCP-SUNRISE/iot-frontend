export interface SpatialNode {
  x: number;
  y: number;
  z: number;
}

export interface TempHumidityNode extends SpatialNode {
  t: number;
  h: number;
}

export interface LightNode extends SpatialNode {
  lux: number;
}

/** Payload on `sunrise/weather/{station_id}/live`. Every reading is optional. */
export interface WeatherReading {
  metadata: { timestamp_ms: number; station_id: string };
  air_temp?: number;
  air_humidity?: number;
  solar_radiation?: number;
  wind_speed?: number;
  wind_direction?: number;
  rain_mm?: number;
}

/** Shape of each entry broadcast on `sunrise/system/registry` by the Edge Server. */
export interface DeviceRecord {
  device_id: string;
  last_status: 'online' | 'offline' | string;
  last_seen: string; // ISO datetime from SQLite
}
