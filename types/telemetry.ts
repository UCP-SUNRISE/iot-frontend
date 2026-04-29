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

/** Shape of each entry broadcast on `sunrise/system/registry` by the Edge Server. */
export interface DeviceRecord {
  device_id: string;
  last_status: 'online' | 'offline' | string;
  last_seen: string; // ISO datetime from SQLite
}
