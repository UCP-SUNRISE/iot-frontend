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
