/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaliperStage, CaliperStageHandle } from './components/CaliperStage';
import { ControlDock } from './components/ControlDock';
import { HeaderBar } from './components/HeaderBar';
import { ReadoutPanel } from './components/ReadoutPanel';
import { AnyScaleMode, InstrumentType, Specimen } from './types/caliper';
import {
  computeInstrumentReading,
  getMaxMm,
  stepInstrumentPositionMm,
} from './utils/metrology';

export default function App() {
  const stageRef = useRef<CaliperStageHandle>(null);

  const [instrument, setInstrument] = useState<InstrumentType>('caliper');
  const [caliperMode, setCaliperMode] = useState<AnyScaleMode>('metric-002');
  const [microMode, setMicroMode] = useState<AnyScaleMode>('micro-001-mm');

  const activeMode = instrument === 'micrometer' ? microMode : caliperMode;

  const [rawMm, setRawMm] = useState<number>(24.68);
  const rawMmRef = useRef<number>(24.68);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [hideReadout, setHideReadout] = useState<boolean>(false);
  const [specimen, setSpecimen] = useState<Specimen | null>(null);
  const [zoomRatio, setZoomRatio] = useState<number>(1);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('vernier-theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('vernier-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('vernier-theme', 'light');
    }
  }, [isDark]);

  const reading = useMemo(
    () => computeInstrumentReading(rawMm, instrument, activeMode, specimen),
    [rawMm, instrument, activeMode, specimen]
  );

  const setClampedRawMm = useCallback(
    (nextRaw: number) => {
      if (isLocked) return;
      setHasInteracted(true);
      const maxMm = getMaxMm(instrument, activeMode);
      let clamped = Math.max(0, Math.min(maxMm, nextRaw));
      if (specimen) {
        if (specimen.kind === 'outside') {
          clamped = Math.max(specimen.dimensionMm, clamped);
        } else {
          clamped = Math.min(specimen.dimensionMm, clamped);
        }
      }
      rawMmRef.current = clamped;
      setRawMm(clamped);
    },
    [activeMode, instrument, isLocked, specimen]
  );

  const handleFineScrubMm = useCallback(
    (deltaMm: number) => {
      setClampedRawMm(rawMmRef.current + deltaMm);
    },
    [setClampedRawMm]
  );

  const handleStep = useCallback(
    (deltaSteps: number) => {
      if (isLocked) return;
      setHasInteracted(true);
      const nextSnapped = stepInstrumentPositionMm(
        reading.positionMm,
        deltaSteps,
        instrument,
        activeMode,
        specimen
      );
      rawMmRef.current = nextSnapped;
      setRawMm(nextSnapped);
    },
    [activeMode, instrument, isLocked, reading.positionMm, specimen]
  );

  const handleZero = useCallback(() => {
    if (isLocked) return;
    setHasInteracted(true);
    if (specimen && specimen.kind === 'outside') {
      setSpecimen(null);
    }
    rawMmRef.current = 0;
    setRawMm(0);
  }, [isLocked, specimen]);

  const handleInstrumentChange = useCallback(
    (nextInst: InstrumentType) => {
      if (nextInst === instrument) return;
      setHasInteracted(true);
      setIsLocked(false);

      // Clear incompatible specimens when switching to micrometer
      let nextSpecimen = specimen;
      if (nextInst === 'micrometer' && specimen && !specimen.micrometerCompatible) {
        nextSpecimen = null;
        setSpecimen(null);
      }

      const nextMode = nextInst === 'micrometer' ? microMode : caliperMode;
      const maxMm = getMaxMm(nextInst, nextMode);
      let nextPos = rawMmRef.current;

      if (nextInst === 'micrometer' && nextPos > maxMm) {
        nextPos = 12.84;
      } else if (nextInst === 'caliper' && nextPos === 12.84) {
        nextPos = 24.68;
      }

      const snapped = computeInstrumentReading(nextPos, nextInst, nextMode, nextSpecimen).positionMm;
      rawMmRef.current = snapped;
      setRawMm(snapped);
      setInstrument(nextInst);
    },
    [caliperMode, instrument, microMode, specimen]
  );

  const handleModeChange = useCallback(
    (nextMode: AnyScaleMode) => {
      if (instrument === 'micrometer') {
        setMicroMode(nextMode);
      } else {
        setCaliperMode(nextMode);
      }
      const snapped = computeInstrumentReading(
        rawMmRef.current,
        instrument,
        nextMode,
        specimen
      ).positionMm;
      rawMmRef.current = snapped;
      setRawMm(snapped);
    },
    [instrument, specimen]
  );

  const handleSelectSpecimen = useCallback(
    (nextSpecimen: Specimen | null) => {
      setHasInteracted(true);
      setIsLocked(false);
      setSpecimen(nextSpecimen);
      if (!nextSpecimen) return;

      const maxMm = getMaxMm(instrument, activeMode);
      if (nextSpecimen.kind === 'outside') {
        const margin = instrument === 'micrometer' ? 4 : 8;
        const target = Math.min(maxMm, Math.max(rawMmRef.current, nextSpecimen.dimensionMm + margin));
        rawMmRef.current = target;
        setRawMm(target);
      } else {
        const target = Math.max(4, Math.min(rawMmRef.current, nextSpecimen.dimensionMm - 10));
        rawMmRef.current = target;
        setRawMm(target);
      }
      stageRef.current?.fitToScreen();
    },
    [activeMode, instrument]
  );

  const handleToggleInspectScale = useCallback(() => {
    setHasInteracted(true);
    if (zoomRatio > 1.8) {
      stageRef.current?.fitToScreen();
    } else {
      stageRef.current?.zoomToScale();
    }
  }, [zoomRatio]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const coarse =
          instrument === 'micrometer'
            ? activeMode === 'micro-001-in'
              ? 25
              : 50
            : activeMode === 'metric-002'
              ? 50
              : activeMode === 'metric-005'
                ? 20
                : 25;
        handleStep(e.shiftKey ? coarse : 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const coarse =
          instrument === 'micrometer'
            ? activeMode === 'micro-001-in'
              ? -25
              : -50
            : activeMode === 'metric-002'
              ? -50
              : activeMode === 'metric-005'
                ? -20
                : -25;
        handleStep(e.shiftKey ? coarse : -1);
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLocked((v) => !v);
      } else if (e.key === 'z' || e.key === 'Z') {
        handleZero();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleInspectScale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, handleStep, handleToggleInspectScale, handleZero, instrument]);

  return (
    <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-[#F4F6F9] dark:bg-[#0B0E14] text-[#11161D] dark:text-slate-100">
      <HeaderBar
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
        mode={activeMode}
        onModeChange={handleModeChange}
        showGuide={showGuide}
        onToggleGuide={() => setShowGuide((v) => !v)}
        specimen={specimen}
        onSelectSpecimen={handleSelectSpecimen}
        isDark={isDark}
        onToggleTheme={() => setIsDark((v) => !v)}
      />

      <main className="relative flex-1 min-h-0 w-full">
        <ReadoutPanel
          instrument={instrument}
          reading={reading}
          hideReadout={hideReadout}
          onToggleHideReadout={() => setHideReadout((v) => !v)}
          zoomRatio={zoomRatio}
          onFit={() => stageRef.current?.fitToScreen()}
          onZoomIn={() => stageRef.current?.zoomBy(1.4)}
          onZoomOut={() => stageRef.current?.zoomBy(1 / 1.4)}
          specimen={specimen}
          isLocked={isLocked}
        />

        <CaliperStage
          ref={stageRef}
          instrument={instrument}
          reading={reading}
          mode={activeMode}
          isLocked={isLocked}
          showGuide={showGuide}
          specimen={specimen}
          onRawPositionChange={setClampedRawMm}
          onZoomRatioChange={setZoomRatio}
        />

        {/* Subtle gesture hint that fades after first interaction */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 transition-opacity duration-300 ${
            hasInteracted ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium text-center bg-white/85 dark:bg-[#121721]/85 backdrop-blur-xs px-3 py-1 rounded-lg border border-slate-200/70 dark:border-slate-800">
            {instrument === 'micrometer'
              ? 'Drag thimble to measure · Pinch to zoom · Drag background to pan'
              : 'Drag sliding jaw to measure · Pinch to zoom · Drag background to pan'}
          </p>
        </div>
      </main>

      <ControlDock
        instrument={instrument}
        mode={activeMode}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked((v) => !v)}
        onZero={handleZero}
        onStep={handleStep}
        onFineScrubMm={handleFineScrubMm}
        zoomRatio={zoomRatio}
        onToggleInspectScale={handleToggleInspectScale}
      />
    </div>
  );
}
