import React from 'react';
import { Eye, EyeOff, Maximize2, Minus, Plus } from 'lucide-react';
import { InstrumentType, Specimen, VernierReading } from '../types/caliper';

interface ReadoutPanelProps {
  instrument: InstrumentType;
  reading: VernierReading;
  hideReadout: boolean;
  onToggleHideReadout: () => void;
  zoomRatio: number;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  specimen: Specimen | null;
  isLocked: boolean;
}

export const ReadoutPanel: React.FC<ReadoutPanelProps> = ({
  instrument,
  reading,
  hideReadout,
  onToggleHideReadout,
  zoomRatio,
  onFit,
  onZoomIn,
  onZoomOut,
  specimen,
  isLocked,
}) => {
  const isZoomedAway = zoomRatio > 1.15 || zoomRatio < 0.88;
  const isContactingSpecimen =
    specimen !== null && Math.abs(reading.positionMm - specimen.dimensionMm) <= reading.stepMm * 0.6;

  const secondaryLabel = instrument === 'micrometer' ? 'CSR' : 'VSR';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5 gap-3">
      {/* Left: Clean floating digital readout with explicit MSR & VSR/CSR */}
      <div className="pointer-events-auto flex flex-col">
        <div className="flex items-center gap-2 sm:gap-3 bg-white/90 dark:bg-[#121721]/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs">
          <div className="min-w-[126px] sm:min-w-[162px]">
            <div className="flex items-baseline">
              <span className="font-mono tabular-nums text-2xl sm:text-4xl font-semibold tracking-tight text-[#11161D] dark:text-slate-50">
                {hideReadout ? (reading.unit === 'in' ? '—.———' : '——.——') : reading.formattedValue}
              </span>
              <span className="ml-1.5 text-xs sm:text-sm font-mono font-medium text-slate-500 dark:text-slate-400">
                {reading.unit}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {hideReadout ? (
                <span>Practice mode · Read scale directly</span>
              ) : (
                <>
                  <span>MSR {reading.mainScaleText}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {secondaryLabel} +{reading.vernierScaleText}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleHideReadout}
            title={hideReadout ? 'Show digital readout' : 'Hide digital readout to practice reading'}
            aria-label={hideReadout ? 'Show digital readout' : 'Hide digital readout'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#11161D] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {hideReadout ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {(specimen || isLocked) && (
          <div className="mt-2 px-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            {isLocked && <span className="text-[#EA4B1E]">Locked</span>}
            {isLocked && specimen && <span aria-hidden="true">·</span>}
            {specimen && (
              <span>
                {specimen.name}
                {isContactingSpecimen ? ' (Contact)' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Subtle zoom HUD & Fit trigger */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-white/90 dark:bg-[#121721]/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-1 shadow-xs">
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="hidden sm:flex min-w-[38px] min-h-[38px] items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-[#11161D] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="px-2 font-mono tabular-nums text-xs font-medium text-slate-600 dark:text-slate-300 select-none">
          {zoomRatio.toFixed(1)}×
        </span>

        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="hidden sm:flex min-w-[38px] min-h-[38px] items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-[#11161D] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {isZoomedAway && (
          <button
            type="button"
            onClick={onFit}
            className="flex items-center gap-1.5 px-2.5 min-h-[38px] rounded-lg bg-[#11161D] dark:bg-slate-100 text-white dark:text-[#11161D] text-xs font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit</span>
          </button>
        )}
      </div>
    </div>
  );
};
