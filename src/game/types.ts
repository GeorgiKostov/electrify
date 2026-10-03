export type Tier = 'LV' | 'MV';
export type Kind =
  | 'grid'
  | 'site'
  | 'transformer'
  | 'home'
  | 'cafe'
  | 'workshop'
  | 'solar'
  | 'batteryQuick'
  | 'batteryLong'
  | 'ev';
export interface Node {
  id: string;
  kind: Kind;
  x: number;
  z: number;
  locked?: boolean;
  size?: 'S' | 'L';
  zone?: 'village' | 'farm' | 'hill' | 'depot' | 'field';
  peakKW?: number;
  siteFactor?: number;
  chargerKW?: number;
  needKWh?: number;
  window?: [number, number];
  placedOrder?: number;
}
export interface Line {
  id: string;
  a: string;
  b: string;
  tier: Tier;
  length: number;
  locked?: boolean;
}
export interface BatterySchedule {
  charge: [number, number];
  discharge: [number, number];
}
export interface State {
  stage: number;
  nodes: Node[];
  lines: Line[];
  batteries: Record<string, BatterySchedule>;
  evStarts: Record<string, number>;
  nextId: number;
}
export interface Diagnostic {
  code:
    | 'OVERLOAD'
    | 'UNCONNECTED'
    | 'GRID_LIMIT'
    | 'BATTERY_EMPTY'
    | 'BATTERY_POWER_LIMIT';
  step: number;
  componentId: string;
  flowKW?: number;
  capacityKW?: number;
  downstreamLoadIds?: string[];
}
export interface StepResult {
  step: number;
  demand: Record<string, number>;
  flow: Record<string, number>;
  requested: Record<string, number>;
  loading: Record<string, number>;
  lossKW: number;
  solarKW: number;
  unusedSolarKW: number;
  batteryKW: Record<string, number>;
  socKWh: Record<string, number>;
  demandKW: number;
  gridKW: number;
  served: Record<string, boolean>;
  evServedKWh: Record<string, number>;
  trips: string[];
  events: Diagnostic[];
}
export interface Metrics {
  unservedKWh: number;
  evShortKWh: number;
  gridImportKWh: number;
  unusedSolarKWh: number;
  lostAsHeatKWh: number;
  buildCost: number;
  peakLoading: Record<string, number>;
}
export interface DayResult {
  steps: StepResult[];
  metrics: Metrics;
  firstFailure?: Diagnostic;
  placementErrors: string[];
}
