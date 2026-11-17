import React, { useMemo } from 'react';
import { ScaleMode, Specimen, VernierReading } from '../types/caliper';
import { CALIPER_SCALE_CONFIGS, IN_TO_MM, UNITS_PER_MM } from '../utils/metrology';

interface CaliperSVGProps {
  reading: VernierReading;
  mode: ScaleMode;
  isLocked: boolean;
  showGuide: boolean;
  specimen: Specimen | null;
  isDraggingSlider: boolean;
}

// Geometry constants in SVG user units (10 units = 1 mm)
export const SCALE_ORIGIN_X = 250; // Main scale "0" mark sits at x = 250 (25 mm)
export const BEAM_LEFT_X = -175;
export const BEAM_RIGHT_X = 2280;
export const BEAM_TOP_Y = -62; // Imperial seam
export const BEAM_BOTTOM_Y = 62; // Metric seam

export const CALIPER_BOUNDS = {
  minX: -200,
  maxX: 2360,
  minY: -245,
  maxY: 410,
};

const PhillipsScrew: React.FC<{ cx: number; cy: number; r?: number }> = ({ cx, cy, r = 10 }) => (
  <g data-caliper-slider="true">
    <circle
      data-caliper-slider="true"
      cx={cx}
      cy={cy}
      r={r}
      fill="url(#chrome-screw)"
      stroke="#525E6E"
      strokeWidth={1.1}
    />
    <line
      data-caliper-slider="true"
      x1={cx - r * 0.55}
      y1={cy - r * 0.25}
      x2={cx + r * 0.55}
      y2={cy + r * 0.25}
      stroke="#334155"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <line
      data-caliper-slider="true"
      x1={cx - r * 0.25}
      y1={cy + r * 0.55}
      x2={cx + r * 0.25}
      y2={cy - r * 0.55}
      stroke="#334155"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </g>
);

export const CaliperSVG: React.FC<CaliperSVGProps> = ({
  reading,
  mode,
  isLocked,
  showGuide,
  specimen,
  isDraggingSlider,
}) => {
  const jawX = reading.positionMm * UNITS_PER_MM;
  const isImperial = mode === 'imperial-001';
  const activeCfg = CALIPER_SCALE_CONFIGS[mode];
  const metricCfg = CALIPER_SCALE_CONFIGS[mode === 'metric-005' ? 'metric-005' : 'metric-002'];
  const imperialCfg = CALIPER_SCALE_CONFIGS['imperial-001'];

  // Metric Main Scale Ticks (bottom edge of beam, pointing UPWARD from y = BEAM_BOTTOM_Y = 62)
  const metricMainTicks = useMemo(() => {
    const items: {
      mm: number;
      x: number;
      height: number;
      strokeWidth: number;
      label?: string;
    }[] = [];
    for (let mm = 0; mm <= 198; mm++) {
      const isCm = mm % 10 === 0;
      const isHalfCm = mm % 5 === 0;
      items.push({
        mm,
        x: SCALE_ORIGIN_X + mm * UNITS_PER_MM,
        height: isCm ? 36 : isHalfCm ? 26 : 17,
        strokeWidth: isCm ? 1.85 : isHalfCm ? 1.35 : 0.95,
        label: isCm && mm <= 190 ? String(mm / 10) : undefined,
      });
    }
    return items;
  }, []);

  // Imperial Main Scale Ticks (top edge of beam, pointing DOWNWARD from y = BEAM_TOP_Y = -62)
  const imperialMainTicks = useMemo(() => {
    const items: {
      t: number;
      x: number;
      height: number;
      strokeWidth: number;
      label?: string;
      isInch: boolean;
    }[] = [];
    const totalTicks = 7 * 40 + 32;
    for (let t = 0; t <= totalTicks; t++) {
      const isInch = t % 40 === 0;
      const isTenth = t % 4 === 0;
      const isHalfTenth = t % 2 === 0;
      const inches = t * 0.025;
      const x = SCALE_ORIGIN_X + inches * IN_TO_MM * UNITS_PER_MM;
      const tenthDigit = (t / 4) % 10;
      let label: string | undefined;
      if (isInch) {
        label = String(Math.round(inches));
      } else if (isTenth && tenthDigit % 2 === 0 && inches < 7.6) {
        label = String(tenthDigit);
      }
      items.push({
        t,
        x,
        height: isInch ? 36 : isTenth ? 26 : isHalfTenth ? 18 : 13,
        strokeWidth: isInch ? 1.85 : isTenth ? 1.35 : 0.95,
        label,
        isInch,
      });
    }
    return items;
  }, []);

  // Metric Vernier Scale Ticks (on lower bevel plate, starting right at y = BEAM_BOTTOM_Y = 62, pointing DOWNWARD)
  const metricVernierTicks = useMemo(() => {
    const divisions = metricCfg.vernierDivisions;
    const pitch = metricCfg.vernierSpanUnits / divisions;
    const items: {
      index: number;
      x: number;
      height: number;
      strokeWidth: number;
      label?: string;
    }[] = [];

    for (let i = 0; i <= divisions; i++) {
      const isMajor = mode === 'metric-005' ? i % 2 === 0 : i % 5 === 0;
      let label: string | undefined;
      if (isMajor) {
        if (mode === 'metric-005') {
          label = i === 20 ? '0' : String(i / 2);
        } else {
          label = i === 50 ? '0' : String(i / 5);
        }
      }
      items.push({
        index: i,
        x: SCALE_ORIGIN_X + i * pitch,
        height: isMajor ? 28 : 18,
        strokeWidth: isMajor ? 1.75 : 1.0,
        label,
      });
    }
    return { items, pitch };
  }, [metricCfg, mode]);

  // Imperial Vernier Scale Ticks (on upper bevel plate, starting right at y = BEAM_TOP_Y = -62, pointing UPWARD)
  const imperialVernierTicks = useMemo(() => {
    const divisions = imperialCfg.vernierDivisions;
    const pitch = imperialCfg.vernierSpanUnits / divisions;
    const items: {
      index: number;
      x: number;
      height: number;
      strokeWidth: number;
      label?: string;
    }[] = [];

    for (let i = 0; i <= divisions; i++) {
      const isMajor = i % 5 === 0;
      items.push({
        index: i,
        x: SCALE_ORIGIN_X + i * pitch,
        height: isMajor ? 26 : 16,
        strokeWidth: isMajor ? 1.7 : 1.0,
        label: isMajor ? String(i) : undefined,
      });
    }
    return { items, pitch };
  }, [imperialCfg]);

  // Coinciding tick coordinates for optional guide
  const activePitch = isImperial ? imperialVernierTicks.pitch : metricVernierTicks.pitch;
  const coincidingX = SCALE_ORIGIN_X + jawX + reading.coincidingTick * activePitch;

  const thumbWheelOffset = (jawX * 0.45) % 14;

  // Slider geometry constants
  const plateLeftX = SCALE_ORIGIN_X - 62;
  const lowerPlateRightX = SCALE_ORIGIN_X + metricCfg.vernierSpanUnits + 62;
  const upperPlateRightX = SCALE_ORIGIN_X + imperialCfg.vernierSpanUnits + 68;

  return (
    <g>
      <defs>
        {/* Polished satin-chrome main beam gradient */}
        <linearGradient id="chrome-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="10%" stopColor="#E9EEF4" />
          <stop offset="35%" stopColor="#F8FAFC" />
          <stop offset="64%" stopColor="#D3DCE6" />
          <stop offset="90%" stopColor="#B4C0CE" />
          <stop offset="100%" stopColor="#8E9AA8" />
        </linearGradient>

        {/* High-luster diagonal chrome reflection for sliding plates */}
        <linearGradient id="chrome-carriage" x1="0.08" y1="0" x2="0.88" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#EBF0F5" />
          <stop offset="48%" stopColor="#C8D2DE" />
          <stop offset="68%" stopColor="#F5F8FB" />
          <stop offset="88%" stopColor="#B8C3D0" />
          <stop offset="100%" stopColor="#94A0AE" />
        </linearGradient>

        {/* Satin glare-free bevel plate for vernier graduations */}
        <linearGradient id="chrome-bevel-lower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CED7E2" />
          <stop offset="12%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#EDF2F7" />
          <stop offset="100%" stopColor="#C7D1DD" />
        </linearGradient>

        <linearGradient id="chrome-bevel-upper" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#CED7E2" />
          <stop offset="12%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#EDF2F7" />
          <stop offset="100%" stopColor="#C7D1DD" />
        </linearGradient>

        {/* Screw head metallic gradient */}
        <radialGradient id="chrome-screw" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#7A8696" />
        </radialGradient>

        {/* Brushed stainless-steel micro-grain */}
        <pattern id="brushed-steel" width="60" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.8" x2="60" y2="0.8" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="0.6" />
          <line x1="0" y1="2.4" x2="60" y2="2.4" stroke="#475569" strokeOpacity="0.06" strokeWidth="0.7" />
        </pattern>

        {/* Dark knurled steel for thumbscrew & roller */}
        <linearGradient id="dark-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#647080" />
          <stop offset="28%" stopColor="#323B46" />
          <stop offset="76%" stopColor="#1B2129" />
          <stop offset="100%" stopColor="#0E1217" />
        </linearGradient>

        {/* Specimen gradients */}
        <linearGradient id="specimen-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="40%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        <linearGradient id="specimen-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0D898" />
          <stop offset="48%" stopColor="#C9A355" />
          <stop offset="100%" stopColor="#8C6A28" />
        </linearGradient>

        <filter id="caliper-shadow" x="-5%" y="-10%" width="112%" height="125%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#090D16" floodOpacity="0.22" />
        </filter>
        <filter id="carriage-shadow" x="-8%" y="-12%" width="118%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#090D16" floodOpacity="0.24" />
        </filter>
      </defs>

      {/* ============================================================
          1. DEPTH ROD (slides with carriage, extends from right end)
          ============================================================ */}
      <g>
        <rect
          x={BEAM_RIGHT_X - 420 + jawX}
          y={-10}
          width={420}
          height={20}
          rx={1}
          fill="url(#chrome-beam)"
          stroke="#5B6675"
          strokeWidth={1.2}
        />
        <path
          d={`M ${BEAM_RIGHT_X + jawX - 18} -10 L ${BEAM_RIGHT_X + jawX} -10 L ${BEAM_RIGHT_X + jawX} 4 L ${BEAM_RIGHT_X + jawX - 18} 4 Z`}
          fill="#B9C4D1"
          stroke="#5B6675"
          strokeWidth={1}
        />
      </g>

      {/* ============================================================
          2. FIXED CHROME FRAME (Unobstructed Main Scale Beam + Fixed Jaws)
          ============================================================ */}
      <g filter="url(#caliper-shadow)">
        <path
          d={`
            M 0 -228
            L 0 ${BEAM_TOP_Y}
            L ${BEAM_RIGHT_X} ${BEAM_TOP_Y}
            L ${BEAM_RIGHT_X} ${BEAM_BOTTOM_Y}
            L 0 ${BEAM_BOTTOM_Y}
            L 0 388
            L -18 388
            L -52 340
            L -52 315
            L -116 245
            L -152 88
            C -156 70, -164 62, -175 62
            L -175 -62
            C -155 -62, -138 -82, -122 -108
            L -48 -188
            L 0 -228
            Z
          `}
          fill="url(#chrome-beam)"
          stroke="#525E6E"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />

        {/* Brushed stainless grain overlay */}
        <path
          d={`
            M 0 -228
            L 0 ${BEAM_TOP_Y}
            L ${BEAM_RIGHT_X} ${BEAM_TOP_Y}
            L ${BEAM_RIGHT_X} ${BEAM_BOTTOM_Y}
            L 0 ${BEAM_BOTTOM_Y}
            L 0 388
            L -18 388
            L -52 340
            L -52 315
            L -116 245
            L -152 88
            C -156 70, -164 62, -175 62
            L -175 -62
            C -155 -62, -138 -82, -122 -108
            L -48 -188
            L 0 -228
            Z
          `}
          fill="url(#brushed-steel)"
          pointerEvents="none"
        />

        {/* End stop plate with 2 screws on right end of beam (like real caliper) */}
        <rect
          x={BEAM_RIGHT_X - 42}
          y={BEAM_TOP_Y + 2}
          width={40}
          height={BEAM_BOTTOM_Y - BEAM_TOP_Y - 4}
          fill="url(#chrome-carriage)"
          stroke="#64748B"
          strokeWidth={1}
        />
        <PhillipsScrew cx={BEAM_RIGHT_X - 22} cy={BEAM_TOP_Y + 20} r={7.5} />
        <PhillipsScrew cx={BEAM_RIGHT_X - 22} cy={BEAM_BOTTOM_Y - 20} r={7.5} />

        {/* Specular highlights along top & bottom edges of beam */}
        <line
          x1={2}
          y1={BEAM_TOP_Y + 1.4}
          x2={BEAM_RIGHT_X - 44}
          y2={BEAM_TOP_Y + 1.4}
          stroke="#FFFFFF"
          strokeOpacity={0.85}
          strokeWidth={1.3}
        />
        <line
          x1={2}
          y1={BEAM_BOTTOM_Y - 1.4}
          x2={BEAM_RIGHT_X - 44}
          y2={BEAM_BOTTOM_Y - 1.4}
          stroke="#FFFFFF"
          strokeOpacity={0.7}
          strokeWidth={1.2}
        />

        {/* Fixed jaw contact edges */}
        <line x1={0} y1={BEAM_BOTTOM_Y} x2={0} y2={388} stroke="#1E2530" strokeWidth={1.6} />
        <line x1={0} y1={-228} x2={0} y2={BEAM_TOP_Y} stroke="#1E2530" strokeWidth={1.4} />

        {/* BOTTOM METRIC MAIN SCALE (ticks end cleanly right at y = BEAM_BOTTOM_Y = +62) */}
        <g opacity={isImperial ? 0.38 : 1}>
          {metricMainTicks.map((tick) => (
            <g key={tick.mm}>
              <line
                x1={tick.x}
                y1={BEAM_BOTTOM_Y}
                x2={tick.x}
                y2={BEAM_BOTTOM_Y - tick.height}
                stroke="#0F141B"
                strokeWidth={tick.strokeWidth}
              />
              {tick.label !== undefined && (
                <text
                  x={tick.x}
                  y={BEAM_BOTTOM_Y - 41}
                  textAnchor="middle"
                  fill="#0F141B"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={700}
                  fontSize={16}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
          <text
            x={SCALE_ORIGIN_X + 15 * 10 * UNITS_PER_MM + 44}
            y={BEAM_BOTTOM_Y - 41}
            fill="#334155"
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
            fontSize={14}
          >
            cm
          </text>
        </g>

        {/* TOP IMPERIAL MAIN SCALE (ticks end cleanly right at y = BEAM_TOP_Y = -62) */}
        <g opacity={isImperial ? 1 : 0.36}>
          {imperialMainTicks.map((tick) => (
            <g key={tick.t}>
              <line
                x1={tick.x}
                y1={BEAM_TOP_Y}
                x2={tick.x}
                y2={BEAM_TOP_Y + tick.height}
                stroke="#0F141B"
                strokeWidth={tick.strokeWidth}
              />
              {tick.label !== undefined && (
                <text
                  x={tick.x}
                  y={BEAM_TOP_Y + (tick.isInch ? 54 : 42)}
                  textAnchor="middle"
                  fill="#0F141B"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={tick.isInch ? 700 : 600}
                  fontSize={tick.isInch ? 17 : 11.5}
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
          <text
            x={SCALE_ORIGIN_X + 6.28 * IN_TO_MM * UNITS_PER_MM}
            y={BEAM_TOP_Y + 52}
            fill="#334155"
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
            fontSize={13}
          >
            in
          </text>
        </g>
      </g>

      {/* ============================================================
          3. OPTIONAL SPECIMEN (Measured Object)
          ============================================================ */}
      {specimen && (
        <g pointerEvents="none">
          {specimen.kind === 'outside' && (
            <g>
              {specimen.id === 'bearing' ? (
                (() => {
                  const d = specimen.dimensionMm * UNITS_PER_MM;
                  const r = d / 2;
                  const cy = 245;
                  return (
                    <g>
                      <circle cx={r} cy={cy} r={r} fill="url(#specimen-steel)" stroke="#334155" strokeWidth={1.8} />
                      <circle cx={r} cy={cy} r={r * 0.72} fill="#CBD5E1" stroke="#475569" strokeWidth={1.2} />
                      <circle cx={r} cy={cy} r={r * 0.44} fill="#F1F5F9" stroke="#334155" strokeWidth={1.5} />
                      <line x1={0} y1={cy - 18} x2={0} y2={cy + 18} stroke="#EA4B1E" strokeWidth={2} />
                      <line x1={d} y1={cy - 18} x2={d} y2={cy + 18} stroke="#EA4B1E" strokeWidth={2} strokeOpacity={Math.abs(jawX - d) < 1 ? 1 : 0.35} />
                    </g>
                  );
                })()
              ) : (
                (() => {
                  const d = specimen.dimensionMm * UNITS_PER_MM;
                  return (
                    <g>
                      <rect x={0} y={185} width={d} height={125} rx={Math.min(6, d * 0.18)} fill="url(#specimen-steel)" stroke="#334155" strokeWidth={1.5} />
                      <line x1={d * 0.3} y1={189} x2={d * 0.3} y2={306} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={Math.min(3, d * 0.14)} />
                      <line x1={0} y1={210} x2={0} y2={280} stroke="#EA4B1E" strokeWidth={2} />
                      <line x1={d} y1={210} x2={d} y2={280} stroke="#EA4B1E" strokeWidth={2} strokeOpacity={Math.abs(jawX - d) < 1 ? 1 : 0.35} />
                    </g>
                  );
                })()
              )}
            </g>
          )}

          {specimen.kind === 'inside' && (
            (() => {
              const d = specimen.dimensionMm * UNITS_PER_MM;
              const wall = 48;
              return (
                <g>
                  <rect x={-wall} y={-222} width={wall} height={95} rx={3} fill="url(#specimen-brass)" stroke="#6B501B" strokeWidth={1.6} />
                  <rect x={d} y={-222} width={wall} height={95} rx={3} fill="url(#specimen-brass)" stroke="#6B501B" strokeWidth={1.6} />
                  <rect x={-wall} y={-235} width={d + wall * 2} height={16} rx={2} fill="url(#specimen-brass)" stroke="#6B501B" strokeWidth={1.4} fillOpacity={0.75} />
                  <line x1={0} y1={-215} x2={0} y2={-135} stroke="#EA4B1E" strokeWidth={2} />
                  <line x1={d} y1={-215} x2={d} y2={-135} stroke="#EA4B1E" strokeWidth={2} strokeOpacity={Math.abs(jawX - d) < 1 ? 1 : 0.35} />
                </g>
              );
            })()
          )}

          {specimen.kind === 'depth' && (
            (() => {
              const depth = specimen.dimensionMm * UNITS_PER_MM;
              return (
                <g>
                  <path
                    d={`
                      M ${BEAM_RIGHT_X} -62
                      L ${BEAM_RIGHT_X + depth + 65} -62
                      L ${BEAM_RIGHT_X + depth + 65} 62
                      L ${BEAM_RIGHT_X} 62
                      L ${BEAM_RIGHT_X} 24
                      L ${BEAM_RIGHT_X + depth} 24
                      L ${BEAM_RIGHT_X + depth} -24
                      L ${BEAM_RIGHT_X} -24
                      Z
                    `}
                    fill="#94A3B8"
                    fillOpacity={0.65}
                    stroke="#475569"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  />
                  <line
                    x1={BEAM_RIGHT_X + depth}
                    y1={-24}
                    x2={BEAM_RIGHT_X + depth}
                    y2={24}
                    stroke="#EA4B1E"
                    strokeWidth={2.2}
                    strokeOpacity={Math.abs(jawX - depth) < 1 ? 1 : 0.4}
                  />
                </g>
              );
            })()
          )}
        </g>
      )}

      {/* ============================================================
          4. SLIDING VERNIER CARRIAGE (Main Scale remains 100% exposed!)
          ============================================================ */}
      <g
        data-caliper-slider="true"
        transform={`translate(${jawX}, 0)`}
        style={{ cursor: isLocked ? 'grab' : isDraggingSlider ? 'grabbing' : 'ew-resize' }}
      >
        {/* Invisible generous touch/pointer hit target */}
        <rect
          data-caliper-slider="true"
          x={-28}
          y={-245}
          width={Math.max(lowerPlateRightX, upperPlateRightX) + 56}
          height={655}
          fill="transparent"
        />

        {/* Top Locking Thumbscrew (mounted onto upper vernier rail) */}
        <g
          data-caliper-slider="true"
          transform={`translate(${SCALE_ORIGIN_X + imperialCfg.vernierSpanUnits * 0.54}, ${isLocked ? -128 : -136})`}
        >
          <rect data-caliper-slider="true" x={-9} y={0} width={18} height={26} fill="url(#chrome-beam)" stroke="#475569" strokeWidth={1.2} />
          <rect
            data-caliper-slider="true"
            x={-26}
            y={-26}
            width={52}
            height={28}
            rx={4}
            fill={isLocked ? '#EA4B1E' : 'url(#dark-chrome)'}
            stroke={isLocked ? '#9A2E0E' : '#0F141B'}
            strokeWidth={1.4}
          />
          {[-16, -8, 0, 8, 16].map((kx) => (
            <line
              key={kx}
              data-caliper-slider="true"
              x1={kx}
              y1={-22}
              x2={kx}
              y2={-2}
              stroke="#FFFFFF"
              strokeOpacity={0.34}
              strokeWidth={1.2}
            />
          ))}
        </g>

        <g data-caliper-slider="true" filter="url(#carriage-shadow)">
          {/* A. LEFT SLIDING JAWS & NECK ONLY (Stops cleanly at x = plateLeftX, never covers Main Scale!) */}
          <path
            data-caliper-slider="true"
            d={`
              M 0 -228
              L 46 -188
              L 120 -116
              C 132 -104, 148 -102, 168 -102
              L ${plateLeftX} -102
              L ${plateLeftX} 138
              L 168 138
              C 146 138, 132 152, 124 185
              L 104 252
              L 52 315
              L 52 340
              L 18 388
              L 0 388
              Z
            `}
            fill="url(#chrome-carriage)"
            stroke="#525E6E"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />

          {/* Brushed grain & grip ribs on left sliding neck */}
          <rect
            data-caliper-slider="true"
            x={8}
            y={-58}
            width={plateLeftX - 16}
            height={116}
            fill="url(#brushed-steel)"
            pointerEvents="none"
          />
          {[0, 12, 24, 36].map((dx) => (
            <line
              key={dx}
              data-caliper-slider="true"
              x1={74 + dx}
              y1={-38}
              x2={74 + dx}
              y2={38}
              stroke="#7A8696"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* Sliding jaw contact edges */}
          <line data-caliper-slider="true" x1={0} y1={BEAM_BOTTOM_Y} x2={0} y2={388} stroke="#1E2530" strokeWidth={1.6} />
          <line data-caliper-slider="true" x1={0} y1={-228} x2={0} y2={BEAM_TOP_Y} stroke="#1E2530" strokeWidth={1.4} />

          {/* B. LOWER VERNIER PLATE (Sits strictly BELOW y = BEAM_BOTTOM_Y = +62!) */}
          <rect
            data-caliper-slider="true"
            x={plateLeftX}
            y={BEAM_BOTTOM_Y}
            width={lowerPlateRightX - plateLeftX}
            height={82}
            rx={2}
            fill="url(#chrome-bevel-lower)"
            stroke="#525E6E"
            strokeWidth={1.6}
          />
          {/* Crisp seam highlight along y = BEAM_BOTTOM_Y */}
          <line
            data-caliper-slider="true"
            x1={plateLeftX}
            y1={BEAM_BOTTOM_Y}
            x2={lowerPlateRightX}
            y2={BEAM_BOTTOM_Y}
            stroke="#1E2530"
            strokeWidth={1.3}
          />
          <line
            data-caliper-slider="true"
            x1={plateLeftX + 1}
            y1={BEAM_BOTTOM_Y + 1.5}
            x2={lowerPlateRightX - 1}
            y2={BEAM_BOTTOM_Y + 1.5}
            stroke="#FFFFFF"
            strokeOpacity={0.9}
            strokeWidth={1.1}
          />

          {/* Lower plate countersunk Phillips screws (left & right like photo) */}
          <PhillipsScrew cx={plateLeftX + 20} cy={BEAM_BOTTOM_Y + 20} r={8.5} />
          <PhillipsScrew cx={lowerPlateRightX - 20} cy={BEAM_BOTTOM_Y + 20} r={8.5} />

          {/* Knurled Thumb Roller beneath lower vernier plate */}
          <g data-caliper-slider="true" transform={`translate(${lowerPlateRightX - 120}, ${BEAM_BOTTOM_Y + 82})`}>
            <rect
              data-caliper-slider="true"
              x={-54}
              y={-4}
              width={108}
              height={30}
              rx={9}
              fill="url(#dark-chrome)"
              stroke="#0F141B"
              strokeWidth={1.4}
            />
            {Array.from({ length: 13 }).map((_, idx) => {
              const kx = -46 + idx * 8 + (thumbWheelOffset % 8) - 4;
              if (kx < -48 || kx > 48) return null;
              return (
                <line
                  key={idx}
                  data-caliper-slider="true"
                  x1={kx}
                  y1={0}
                  x2={kx}
                  y2={22}
                  stroke="#FFFFFF"
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                />
              );
            })}
          </g>

          {/* Lower Metric Vernier Ticks & Numerals (start right at y = +62, pointing DOWNWARD) */}
          <g data-caliper-slider="true" opacity={isImperial ? 0.42 : 1}>
            {metricVernierTicks.items.map((tick) => {
              const isZero = tick.index === 0;
              const isCoinciding = !isImperial && showGuide && tick.index === reading.coincidingTick;
              const color = isCoinciding ? '#EA4B1E' : isZero && !isImperial ? '#EA4B1E' : '#0F141B';
              return (
                <g key={tick.index} data-caliper-slider="true">
                  <line
                    data-caliper-slider="true"
                    x1={tick.x}
                    y1={BEAM_BOTTOM_Y}
                    x2={tick.x}
                    y2={BEAM_BOTTOM_Y + tick.height}
                    stroke={color}
                    strokeWidth={isCoinciding ? 2.2 : isZero ? 2.0 : tick.strokeWidth}
                  />
                  {tick.label !== undefined && (
                    <text
                      data-caliper-slider="true"
                      x={tick.x}
                      y={BEAM_BOTTOM_Y + 52}
                      textAnchor="middle"
                      fill={color}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={isZero || isCoinciding ? 700 : 600}
                      fontSize={16}
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              data-caliper-slider="true"
              x={lowerPlateRightX - 14}
              y={BEAM_BOTTOM_Y + 68}
              textAnchor="end"
              fill="#475569"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={700}
              fontSize={12}
            >
              {mode === 'metric-005' ? '0.05mm' : '0.02mm'}
            </text>
          </g>

          {/* C. UPPER VERNIER PLATE (Sits strictly ABOVE y = BEAM_TOP_Y = -62!) */}
          <rect
            data-caliper-slider="true"
            x={plateLeftX}
            y={BEAM_TOP_Y - 56}
            width={upperPlateRightX - plateLeftX}
            height={56}
            rx={2}
            fill="url(#chrome-bevel-upper)"
            stroke="#525E6E"
            strokeWidth={1.6}
          />
          <line
            data-caliper-slider="true"
            x1={plateLeftX}
            y1={BEAM_TOP_Y}
            x2={upperPlateRightX}
            y2={BEAM_TOP_Y}
            stroke="#1E2530"
            strokeWidth={1.3}
          />
          <line
            data-caliper-slider="true"
            x1={plateLeftX + 1}
            y1={BEAM_TOP_Y - 1.5}
            x2={upperPlateRightX - 1}
            y2={BEAM_TOP_Y - 1.5}
            stroke="#FFFFFF"
            strokeOpacity={0.9}
            strokeWidth={1.1}
          />

          <PhillipsScrew cx={plateLeftX + 20} cy={BEAM_TOP_Y - 36} r={7.5} />
          <PhillipsScrew cx={upperPlateRightX - 20} cy={BEAM_TOP_Y - 36} r={7.5} />

          {/* Upper Imperial Vernier Ticks (start right at y = -62, pointing UPWARD) */}
          <g data-caliper-slider="true" opacity={isImperial ? 1 : 0.42}>
            {imperialVernierTicks.items.map((tick) => {
              const isZero = tick.index === 0;
              const isCoinciding = isImperial && showGuide && tick.index === reading.coincidingTick;
              const color = isCoinciding ? '#EA4B1E' : isZero && isImperial ? '#EA4B1E' : '#0F141B';
              return (
                <g key={tick.index} data-caliper-slider="true">
                  <line
                    data-caliper-slider="true"
                    x1={tick.x}
                    y1={BEAM_TOP_Y}
                    x2={tick.x}
                    y2={BEAM_TOP_Y - tick.height}
                    stroke={color}
                    strokeWidth={isCoinciding ? 2.2 : isZero ? 2.0 : tick.strokeWidth}
                  />
                  {tick.label !== undefined && (
                    <text
                      data-caliper-slider="true"
                      x={tick.x}
                      y={BEAM_TOP_Y - 34}
                      textAnchor="middle"
                      fill={color}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={isZero || isCoinciding ? 700 : 600}
                      fontSize={14}
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              data-caliper-slider="true"
              x={upperPlateRightX - 14}
              y={BEAM_TOP_Y - 12}
              textAnchor="end"
              fill="#475569"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={700}
              fontSize={12}
            >
              0.001in
            </text>
          </g>

          {/* Subtle active highlight border when actively dragging slider */}
          {isDraggingSlider && (
            <rect
              data-caliper-slider="true"
              x={plateLeftX}
              y={isImperial ? BEAM_TOP_Y - 56 : BEAM_BOTTOM_Y}
              width={(isImperial ? upperPlateRightX : lowerPlateRightX) - plateLeftX}
              height={isImperial ? 56 : 82}
              fill="none"
              stroke="#EA4B1E"
              strokeOpacity={0.5}
              strokeWidth={1.8}
              pointerEvents="none"
            />
          )}
        </g>
      </g>

      {/* ============================================================
          5. OPTIONAL ALIGNMENT GUIDE (Coinciding Line)
          ============================================================ */}
      {showGuide && (
        <g pointerEvents="none">
          {isImperial ? (
            <>
              <line
                x1={coincidingX}
                y1={BEAM_TOP_Y - 52}
                x2={coincidingX}
                y2={BEAM_TOP_Y + 46}
                stroke="#EA4B1E"
                strokeWidth={1.7}
                strokeDasharray="4 3"
              />
              <circle cx={coincidingX} cy={BEAM_TOP_Y} r={3.8} fill="#EA4B1E" />
            </>
          ) : (
            <>
              <line
                x1={coincidingX}
                y1={BEAM_BOTTOM_Y - 46}
                x2={coincidingX}
                y2={BEAM_BOTTOM_Y + 62}
                stroke="#EA4B1E"
                strokeWidth={1.7}
                strokeDasharray="4 3"
              />
              <circle cx={coincidingX} cy={BEAM_BOTTOM_Y} r={3.8} fill="#EA4B1E" />
            </>
          )}
          <text
            x={BEAM_LEFT_X + 20}
            y={0}
            fill="transparent"
            fontSize={1}
          >
            {activeCfg.shortLabel}
          </text>
        </g>
      )}
    </g>
  );
};
