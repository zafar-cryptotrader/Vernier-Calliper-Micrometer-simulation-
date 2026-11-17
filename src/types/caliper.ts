export type InstrumentType = 'caliper' | 'micrometer';

export type ScaleMode = 'metric-002' | 'metric-005' | 'imperial-001';
export type MicrometerScaleMode = 'micro-001-mm' | 'micro-001-in';
export type AnyScaleMode = ScaleMode | MicrometerScaleMode;

export type SpecimenKind = 'outside' | 'inside' | 'depth';

export interface Specimen {
  id: string;
  name: string;
  subtitle: string;
  kind: SpecimenKind;
  /** True dimension in millimeters */
  dimensionMm: number;
  /** Whether compatible with micrometer (0–25 mm outside only) */
  micrometerCompatible?: boolean;
}

export interface CameraState {
  /** Pan offset in screen CSS pixels */
  x: number;
  /** Pan offset in screen CSS pixels */
  y: number;
  /** Zoom multiplier relative to SVG world units */
  scale: number;
}

export interface VernierReading {
  /** Exact snapped position in mm (used to render the jaw/spindle) */
  positionMm: number;
  /** Formatted primary numeric value (e.g. "24.68" or "1.245") */
  formattedValue: string;
  /** Unit suffix ("mm" or "in") */
  unit: 'mm' | 'in';
  /** Main scale reading string (MSR) */
  mainScaleText: string;
  /** Vernier / Circular scale contribution string (VSR / CSR) */
  vernierScaleText: string;
  /** 0-based index of the coinciding vernier/circular tick mark */
  coincidingTick: number;
  /** Exact main scale tick index that coincides with the vernier tick */
  coincidingMainTick: number;
  /** Least count label ("0.02 mm", "0.05 mm", "0.001 in", "0.01 mm") */
  leastCountLabel: string;
  /** Least count step in millimeters */
  stepMm: number;
  /** Pitch in mm for micrometer thimble rotation (optional) */
  pitchMm?: number;
  /** Total divisions on circular thimble (optional) */
  circularDivisions?: number;
}
