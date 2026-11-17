import React, { useEffect, useRef, useState } from 'react';
import { Lock, Maximize2, Minus, Plus, RotateCcw, Search, Unlock } from 'lucide-react';
import { AnyScaleMode, InstrumentType } from '../types/caliper';
import { CALIPER_SCALE_CONFIGS, MICROMETER_SCALE_CONFIGS } from '../utils/metrology';

interface ControlDockProps {
  instrument: InstrumentType;
  mode: AnyScaleMode;
  isLocked: boolean;
  onToggleLock: () => void;
  onZero: () => void;
  onStep: (deltaSteps: number) => void;
  onFineScrubMm: (deltaMm: number) => void;
  zoomRatio: number;
  onToggleInspectScale: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  instrument,
  mode,
  isLocked,
  onToggleLock,
  onZero,
  onStep,
  onFineScrubMm,
  zoomRatio,
  onToggleInspectScale,
}) => {
  const stepLabel =
    instrument === 'micrometer'
      ? MICROMETER_SCALE_CONFIGS[
          mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm'
        ].label
      : CALIPER_SCALE_CONFIGS[
          mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002'
        ].label;

  const isZoomedIn = zoomRatio > 1.8;

  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const stopHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => stopHold, []);

  const startHold = (delta: number) => {
    if (isLocked) return;
    onStep(delta);
    stopHold();
    holdTimerRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        onStep(delta);
      }, 65);
    }, 320);
  };

  const scrubRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const [scrubShift, setScrubShift] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleScrubDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubRef.current = { active: true, lastX: e.clientX };
    setIsScrubbing(true);
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubRef.current.active || isLocked) return;
    const dx = e.clientX - scrubRef.current.lastX;
    scrubRef.current.lastX = e.clientX;
    const sensitivity = instrument === 'micrometer' ? 0.008 : 0.016;
    onFineScrubMm(dx * sensitivity);
    setScrubShift((prev) => ((prev + dx * 0.8) % 24 + 24) % 24);
  };

  const handleScrubUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubRef.current.active) return;
    scrubRef.current.active = false;
    setIsScrubbing(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <footer className="relative z-30 bg-white/95 dark:bg-[#121721]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 pt-2.5 pb-safe shrink-0">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Lock & Zero */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLock}
            aria-pressed={isLocked}
            title={isLocked ? 'Unlock (L)' : 'Lock (L)'}
            className={`min-w-[44px] min-h-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isLocked
                ? 'bg-[#EA4B1E] text-white border-[#EA4B1E]'
                : 'bg-slate-50 dark:bg-[#1A212E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#232C3D]'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
            <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Lock'}</span>
          </button>

          <button
            type="button"
            onClick={onZero}
            disabled={isLocked}
            title="Return to zero (Z)"
            className="min-w-[44px] min-h-[44px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#1A212E] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#232C3D] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Zero</span>
          </button>
        </div>

        {/* Center: Thumb-zone fine-tune stepper + geared roller */}
        <div className="flex-1 max-w-md flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            disabled={isLocked}
            onPointerDown={() => startHold(-1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            aria-label={`Step minus ${stepLabel}`}
            title={`Step -${stepLabel}`}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#1A212E] border border-slate-200 dark:border-slate-700 text-[#11161D] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#232C3D] active:bg-slate-200 dark:active:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shrink-0 select-none"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div
            onPointerDown={handleScrubDown}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubUp}
            onPointerCancel={handleScrubUp}
            role="slider"
            aria-label="Fine-tune thumb roller"
            aria-disabled={isLocked}
            className={`relative flex-1 min-w-[76px] h-[44px] rounded-xl border overflow-hidden select-none touch-none flex items-center justify-center transition-colors ${
              isLocked
                ? 'bg-slate-100 dark:bg-[#161C27] border-slate-200 dark:border-slate-800 opacity-45 cursor-not-allowed'
                : isScrubbing
                  ? 'bg-slate-100 dark:bg-[#202938] border-[#EA4B1E]/60 cursor-grabbing'
                  : 'bg-slate-50 dark:bg-[#1A212E] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-ew-resize'
            }`}
          >
            <div
              className="absolute inset-y-0 -inset-x-6 knurled-strip pointer-events-none"
              style={{ transform: `translateX(${scrubShift - 12}px)` }}
            />
            <div className="relative z-10 px-2 py-0.5 rounded bg-white/85 dark:bg-[#121721]/85 backdrop-blur-xs border border-slate-200/70 dark:border-slate-700/70 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 pointer-events-none whitespace-nowrap">
              {isLocked ? 'LOCKED' : 'FINE ROLLER'}
            </div>
          </div>

          <button
            type="button"
            disabled={isLocked}
            onPointerDown={() => startHold(1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            aria-label={`Step plus ${stepLabel}`}
            title={`Step +${stepLabel}`}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#1A212E] border border-slate-200 dark:border-slate-700 text-[#11161D] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#232C3D] active:bg-slate-200 dark:active:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shrink-0 select-none"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick zoom to scale */}
        <button
          type="button"
          onClick={onToggleInspectScale}
          title={isZoomedIn ? 'Fit full instrument' : 'Zoom into scale'}
          className={`min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isZoomedIn
              ? 'bg-[#11161D] dark:bg-slate-100 text-white dark:text-[#11161D] border-[#11161D] dark:border-slate-100'
              : 'bg-slate-50 dark:bg-[#1A212E] text-[#11161D] dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#232C3D]'
          }`}
        >
          {isZoomedIn ? <Maximize2 className="w-4 h-4 shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
          <span className="hidden sm:inline">{isZoomedIn ? 'Fit View' : 'Inspect Scale'}</span>
        </button>
      </div>
    </footer>
  );
};
