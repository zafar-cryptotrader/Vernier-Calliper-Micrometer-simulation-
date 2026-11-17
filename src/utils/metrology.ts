import { AnyScaleMode, InstrumentType, MicrometerScaleMode, ScaleMode, Specimen, VernierReading } from '../types/caliper';

export const MAX_CALIPER_MM = 150;
export const MAX_MICROMETER_MM = 25;
export const MM_TO_IN = 1 / 25.4;
export const IN_TO_MM = 25.4;

/**
 * SVG Coordinate System:
 * 1 mm = 10 SVG user units.
 */
export const UNITS_PER_MM = 10;

export const CALIPER_SCALE_CONFIGS: Record<
  ScaleMode,
  {
    label: string;
    shortLabel: string;
    unit: 'mm' | 'in';
    leastCount: number;
    decimals: number;
    vernierDivisions: number;
    vernierSpanUnits: number;
    maxSteps: number;
  }
> = {
  'metric-002': {
    label: '0.02 mm',
    shortLabel: '0.02',
    unit: 'mm',
    leastCount: 0.02,
    decimals: 2,
    vernierDivisions: 50,
    vernierSpanUnits: 49 * UNITS_PER_MM,
    maxSteps: Math.round(MAX_CALIPER_MM / 0.02),
  },
  'metric-005': {
    label: '0.05 mm',
    shortLabel: '0.05',
    unit: 'mm',
    leastCount: 0.05,
    decimals: 2,
    vernierDivisions: 20,
    vernierSpanUnits: 39 * UNITS_PER_MM,
    maxSteps: Math.round(MAX_CALIPER_MM / 0.05),
  },
  'imperial-001': {
    label: '0.001 in',
    shortLabel: '0.001"',
    unit: 'in',
    leastCount: 0.001,
    decimals: 3,
    vernierDivisions: 25,
    vernierSpanUnits: 1.225 * IN_TO_MM * UNITS_PER_MM,
    maxSteps: Math.floor((MAX_CALIPER_MM * MM_TO_IN) / 0.001),
  },
};

export const MICROMETER_SCALE_CONFIGS: Record<
  MicrometerScaleMode,
  {
    label: string;
    shortLabel: string;
    unit: 'mm' | 'in';
    leastCount: number;
    decimals: number;
    circularDivisions: number;
    pitchMm: number;
    maxSteps: number;
  }
> = {
  'micro-001-mm': {
    label: '0.01 mm',
    shortLabel: '0.01',
    unit: 'mm',
    leastCount: 0.01,
    decimals: 2,
    circularDivisions: 50,
    pitchMm: 0.5,
    maxSteps: 2500, // 25.00 mm
  },
  'micro-001-in': {
    label: '0.001 in',
    shortLabel: '0.001"',
    unit: 'in',
    leastCount: 0.001,
    decimals: 3,
    circularDivisions: 25,
    pitchMm: 0.025 * IN_TO_MM,
    maxSteps: 1000, // 1.000 in = 25.40 mm
  },
};

export const SPECIMENS: Specimen[] = [
  {
    id: 'bearing',
    name: 'Ball Bearing',
    subtitle: 'Outer diameter · 18.42 mm',
    kind: 'outside',
    dimensionMm: 18.42,
    micrometerCompatible: true,
  },
  {
    id: 'dowel',
    name: 'Precision Dowel Pin',
    subtitle: 'Outer diameter · 9.96 mm',
    kind: 'outside',
    dimensionMm: 9.96,
    micrometerCompatible: true,
  },
  {
    id: 'wire',
    name: 'Gauge Wire',
    subtitle: 'Outer diameter · 2.48 mm',
    kind: 'outside',
    dimensionMm: 2.48,
    micrometerCompatible: true,
  },
  {
    id: 'bushing',
    name: 'Bronze Bushing Bore',
    subtitle: 'Internal diameter · 24.60 mm',
    kind: 'inside',
    dimensionMm: 24.6,
    micrometerCompatible: false,
  },
  {
    id: 'step-block',
    name: 'Machined Step Bore',
    subtitle: 'Step depth · 31.28 mm',
    kind: 'depth',
    dimensionMm: 31.28,
    micrometerCompatible: false,
  },
];

export function getMaxMm(instrument: InstrumentType, mode: AnyScaleMode): number {
  if (instrument === 'micrometer') {
    return mode === 'micro-001-in' ? 1.0 * IN_TO_MM : MAX_MICROMETER_MM;
  }
  return MAX_CALIPER_MM;
}

export function computeInstrumentReading(
  rawMm: number,
  instrument: InstrumentType,
  mode: AnyScaleMode,
  specimen: Specimen | null
): VernierReading {
  if (instrument === 'micrometer') {
    const microMode: MicrometerScaleMode = mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm';
    const cfg = MICROMETER_SCALE_CONFIGS[microMode];
    const maxMm = getMaxMm('micrometer', microMode);

    let clampedMm = Math.max(0, Math.min(maxMm, rawMm));
    if (specimen && specimen.kind === 'outside') {
      clampedMm = Math.max(specimen.dimensionMm, clampedMm);
    }

    if (microMode === 'micro-001-mm') {
      let stepIndex = Math.round(clampedMm * 100);
      stepIndex = Math.max(0, Math.min(cfg.maxSteps, stepIndex));
      if (specimen && specimen.kind === 'outside' && stepIndex * 0.01 < specimen.dimensionMm) {
        stepIndex = Math.ceil(specimen.dimensionMm * 100);
      }

      const positionMm = stepIndex / 100;
      const halfMmCount = Math.floor(stepIndex / 50);
      const msrMm = halfMmCount * 0.5;
      const circularTick = stepIndex % 50;
      const csrMm = circularTick * 0.01;

      return {
        positionMm,
        formattedValue: positionMm.toFixed(2),
        unit: 'mm',
        mainScaleText: msrMm.toFixed(2),
        vernierScaleText: csrMm.toFixed(2),
        coincidingTick: circularTick,
        coincidingMainTick: halfMmCount,
        leastCountLabel: cfg.label,
        stepMm: 0.01,
        pitchMm: cfg.pitchMm,
        circularDivisions: cfg.circularDivisions,
      };
    }

    // Imperial 0.001 in micrometer
    const rawInches = clampedMm * MM_TO_IN;
    let stepIndex = Math.round(rawInches * 1000);
    stepIndex = Math.max(0, Math.min(cfg.maxSteps, stepIndex));
    if (specimen && specimen.kind === 'outside') {
      const specInches = specimen.dimensionMm * MM_TO_IN;
      if (stepIndex * 0.001 < specInches) {
        stepIndex = Math.ceil(specInches * 1000);
      }
    }

    const inches = stepIndex / 1000;
    const positionMm = inches * IN_TO_MM;
    const pitchCount = Math.floor(stepIndex / 25);
    const msrIn = pitchCount * 0.025;
    const circularTick = stepIndex % 25;
    const csrIn = circularTick * 0.001;

    return {
      positionMm,
      formattedValue: inches.toFixed(3),
      unit: 'in',
      mainScaleText: msrIn.toFixed(3),
      vernierScaleText: csrIn.toFixed(3),
      coincidingTick: circularTick,
      coincidingMainTick: pitchCount,
      leastCountLabel: cfg.label,
      stepMm: 0.001 * IN_TO_MM,
      pitchMm: cfg.pitchMm,
      circularDivisions: cfg.circularDivisions,
    };
  }

  // Vernier Caliper
  const calMode: ScaleMode =
    mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002';
  const cfg = CALIPER_SCALE_CONFIGS[calMode];

  let clampedMm = Math.max(0, Math.min(MAX_CALIPER_MM, rawMm));
  if (specimen) {
    if (specimen.kind === 'outside') {
      clampedMm = Math.max(specimen.dimensionMm, clampedMm);
    } else if (specimen.kind === 'inside' || specimen.kind === 'depth') {
      clampedMm = Math.min(specimen.dimensionMm, clampedMm);
    }
  }

  if (calMode === 'metric-002' || calMode === 'metric-005') {
    const stepsPerMm = calMode === 'metric-002' ? 50 : 20;
    const stepMm = 1 / stepsPerMm;
    let stepIndex = Math.round(clampedMm * stepsPerMm);
    stepIndex = Math.max(0, Math.min(cfg.maxSteps, stepIndex));

    if (specimen) {
      if (specimen.kind === 'outside' && stepIndex * stepMm < specimen.dimensionMm) {
        stepIndex = Math.ceil(specimen.dimensionMm * stepsPerMm);
      } else if (
        (specimen.kind === 'inside' || specimen.kind === 'depth') &&
        stepIndex * stepMm > specimen.dimensionMm
      ) {
        stepIndex = Math.floor(specimen.dimensionMm * stepsPerMm);
      }
    }

    const positionMm = stepIndex / stepsPerMm;
    const wholeMm = Math.floor(stepIndex / stepsPerMm);
    const vernierIndex = stepIndex % stepsPerMm;
    const vernierMm = vernierIndex * stepMm;
    const stride = calMode === 'metric-002' ? 1 : 2;

    return {
      positionMm,
      formattedValue: positionMm.toFixed(2),
      unit: 'mm',
      mainScaleText: wholeMm.toFixed(2),
      vernierScaleText: vernierMm.toFixed(2),
      coincidingTick: vernierIndex,
      coincidingMainTick: wholeMm + vernierIndex * stride,
      leastCountLabel: cfg.label,
      stepMm,
    };
  }

  // Imperial 0.001 in Caliper
  const rawInches = clampedMm * MM_TO_IN;
  let stepIndex = Math.round(rawInches * 1000);
  stepIndex = Math.max(0, Math.min(cfg.maxSteps, stepIndex));

  if (specimen) {
    const specInches = specimen.dimensionMm * MM_TO_IN;
    if (specimen.kind === 'outside' && stepIndex * 0.001 < specInches) {
      stepIndex = Math.ceil(specInches * 1000);
    } else if (
      (specimen.kind === 'inside' || specimen.kind === 'depth') &&
      stepIndex * 0.001 > specInches
    ) {
      stepIndex = Math.floor(specInches * 1000);
    }
  }

  const inches = stepIndex / 1000;
  const positionMm = inches * IN_TO_MM;
  const mainTickIndex = Math.floor(stepIndex / 25);
  const mainIn = mainTickIndex * 0.025;
  const vernierThousandths = stepIndex % 25;
  const vernierIn = vernierThousandths * 0.001;

  return {
    positionMm,
    formattedValue: inches.toFixed(3),
    unit: 'in',
    mainScaleText: mainIn.toFixed(3),
    vernierScaleText: vernierIn.toFixed(3),
    coincidingTick: vernierThousandths,
    coincidingMainTick: mainTickIndex + vernierThousandths * 2,
    leastCountLabel: cfg.label,
    stepMm: 0.001 * IN_TO_MM,
  };
}

export function stepInstrumentPositionMm(
  currentMm: number,
  deltaSteps: number,
  instrument: InstrumentType,
  mode: AnyScaleMode,
  specimen: Specimen | null
): number {
  if (instrument === 'micrometer') {
    const microMode: MicrometerScaleMode = mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm';
    const cfg = MICROMETER_SCALE_CONFIGS[microMode];
    if (microMode === 'micro-001-mm') {
      const nextStep = Math.max(0, Math.min(cfg.maxSteps, Math.round(currentMm * 100) + deltaSteps));
      return computeInstrumentReading(nextStep / 100, instrument, microMode, specimen).positionMm;
    }
    const curSteps = Math.round(currentMm * MM_TO_IN * 1000);
    const nextStep = Math.max(0, Math.min(cfg.maxSteps, curSteps + deltaSteps));
    return computeInstrumentReading((nextStep / 1000) * IN_TO_MM, instrument, microMode, specimen).positionMm;
  }

  const calMode: ScaleMode =
    mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002';
  const cfg = CALIPER_SCALE_CONFIGS[calMode];
  if (calMode === 'metric-002' || calMode === 'metric-005') {
    const stepsPerMm = calMode === 'metric-002' ? 50 : 20;
    const nextStep = Math.max(0, Math.min(cfg.maxSteps, Math.round(currentMm * stepsPerMm) + deltaSteps));
    return computeInstrumentReading(nextStep / stepsPerMm, instrument, calMode, specimen).positionMm;
  }
  const currentSteps = Math.round(currentMm * MM_TO_IN * 1000);
  const nextStep = Math.max(0, Math.min(cfg.maxSteps, currentSteps + deltaSteps));
  return computeInstrumentReading((nextStep / 1000) * IN_TO_MM, instrument, calMode, specimen).positionMm;
}
