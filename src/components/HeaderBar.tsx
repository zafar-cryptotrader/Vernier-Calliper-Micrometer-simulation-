import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Crosshair, Layers, Moon, Sun, X } from 'lucide-react';
import {
  AnyScaleMode,
  InstrumentType,
  MicrometerScaleMode,
  ScaleMode,
  Specimen,
} from '../types/caliper';
import {
  CALIPER_SCALE_CONFIGS,
  MICROMETER_SCALE_CONFIGS,
  SPECIMENS,
} from '../utils/metrology';

interface HeaderBarProps {
  instrument: InstrumentType;
  onInstrumentChange: (inst: InstrumentType) => void;
  mode: AnyScaleMode;
  onModeChange: (mode: AnyScaleMode) => void;
  showGuide: boolean;
  onToggleGuide: () => void;
  specimen: Specimen | null;
  onSelectSpecimen: (specimen: Specimen | null) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const CALIPER_MODES: ScaleMode[] = ['metric-002', 'metric-005', 'imperial-001'];
const MICROMETER_MODES: MicrometerScaleMode[] = ['micro-001-mm', 'micro-001-in'];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  instrument,
  onInstrumentChange,
  mode,
  onModeChange,
  showGuide,
  onToggleGuide,
  specimen,
  onSelectSpecimen,
  isDark,
  onToggleTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [menuOpen]);

  const availableSpecimens =
    instrument === 'micrometer'
      ? SPECIMENS.filter((s) => s.micrometerCompatible)
      : SPECIMENS;

  const activeModeLabel =
    instrument === 'micrometer'
      ? MICROMETER_SCALE_CONFIGS[
          mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm'
        ].shortLabel
      : CALIPER_SCALE_CONFIGS[
          mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002'
        ].shortLabel;

  const cycleMobileMode = () => {
    if (instrument === 'micrometer') {
      const idx = MICROMETER_MODES.indexOf(
        mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm'
      );
      onModeChange(MICROMETER_MODES[(idx + 1) % MICROMETER_MODES.length]);
    } else {
      const calMode: ScaleMode =
        mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002';
      const idx = CALIPER_MODES.indexOf(calMode);
      onModeChange(CALIPER_MODES[(idx + 1) % CALIPER_MODES.length]);
    }
  };

  return (
    <header className="relative z-30 flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6 h-14 bg-white/95 dark:bg-[#121721]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 pt-safe shrink-0 w-full">
      {/* Left: Instrument Toggle (Vernier Caliper / Screw Gauge) */}
      <div
        className="flex items-center p-0.5 bg-slate-100 dark:bg-[#1A212E] rounded-lg border border-slate-200/70 dark:border-slate-700/70 shrink-0"
        role="group"
        aria-label="Instrument selector"
      >
        <button
          type="button"
          onClick={() => onInstrumentChange('caliper')}
          className={`px-2 sm:px-3 min-h-[36px] text-[11px] sm:text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            instrument === 'caliper'
              ? 'bg-white dark:bg-[#273142] text-[#11161D] dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#11161D] dark:hover:text-slate-200'
          }`}
        >
          <span className="sm:hidden">Caliper</span>
          <span className="hidden sm:inline">Vernier Caliper</span>
        </button>

        <button
          type="button"
          onClick={() => onInstrumentChange('micrometer')}
          className={`px-2 sm:px-3 min-h-[36px] text-[11px] sm:text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            instrument === 'micrometer'
              ? 'bg-white dark:bg-[#273142] text-[#11161D] dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-[#11161D] dark:hover:text-slate-200'
          }`}
        >
          <span className="sm:hidden">Screw</span>
          <span className="hidden sm:inline">Screw Gauge</span>
        </button>
      </div>

      {/* Center: Precision Selector (segmented on sm+, compact cycle button on mobile) */}
      <button
        type="button"
        onClick={cycleMobileMode}
        title="Tap to cycle scale precision"
        className="sm:hidden px-2 min-h-[38px] text-[11px] font-mono font-medium rounded-lg bg-slate-100 dark:bg-[#1A212E] text-[#11161D] dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap shrink-0 cursor-pointer"
      >
        {activeModeLabel}
      </button>

      <div
        className="hidden sm:flex items-center p-0.5 bg-slate-100 dark:bg-[#1A212E] rounded-lg border border-slate-200/70 dark:border-slate-700/70 shrink-0"
        role="group"
        aria-label="Scale Precision"
      >
        {instrument === 'caliper'
          ? CALIPER_MODES.map((m) => {
              const active = mode === m;
              const cfg = CALIPER_SCALE_CONFIGS[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={`px-3 min-h-[36px] text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#273142] text-[#11161D] dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#11161D] dark:hover:text-slate-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })
          : MICROMETER_MODES.map((m) => {
              const active = mode === m;
              const cfg = MICROMETER_SCALE_CONFIGS[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={`px-3 min-h-[36px] text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#273142] text-[#11161D] dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#11161D] dark:hover:text-slate-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
      </div>

      {/* Right Tools: Guide, Specimen, Dark Mode */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleGuide}
          title="Toggle alignment guide"
          aria-pressed={showGuide}
          className={`flex items-center gap-1.5 px-2 sm:px-3 min-h-[42px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] justify-center rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
            showGuide
              ? 'bg-[#EA4B1E]/12 text-[#EA4B1E] border-[#EA4B1E]/35'
              : 'bg-white dark:bg-[#1A212E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-[#11161D] dark:hover:text-white'
          }`}
        >
          <Crosshair className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Guide</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            title="Select test specimen"
            className={`flex items-center gap-1.5 px-2 sm:px-3 min-h-[42px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] justify-center rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              specimen
                ? 'bg-[#11161D] dark:bg-slate-100 text-white dark:text-[#11161D] border-[#11161D] dark:border-slate-100'
                : 'bg-white dark:bg-[#1A212E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#232C3D]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline max-w-[110px] truncate">
              {specimen ? specimen.name : 'Object'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#161C27] rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-50">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-[#11161D] dark:text-slate-100">
                  Test Specimen
                </span>
                {specimen && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSpecimen(null);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-[#EA4B1E] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectSpecimen(null);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  !specimen
                    ? 'bg-slate-50 dark:bg-slate-800/70 font-semibold text-[#11161D] dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span>Free Measurement</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {instrument === 'micrometer' ? '0–25 mm' : '0–150 mm'}
                </span>
              </button>

              {availableSpecimens.map((item) => {
                const selected = specimen?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSpecimen(item);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800 ${
                      selected
                        ? 'bg-[#EA4B1E]/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        selected ? 'text-[#EA4B1E]' : 'text-[#11161D] dark:text-slate-100'
                      }`}
                    >
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {item.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="min-w-[40px] sm:min-w-[44px] min-h-[42px] sm:min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A212E] text-slate-600 dark:text-slate-300 hover:text-[#11161D] dark:hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
