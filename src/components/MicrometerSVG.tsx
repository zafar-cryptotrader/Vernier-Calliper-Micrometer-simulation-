import React, { useMemo } from 'react';
import { MicrometerScaleMode, Specimen, VernierReading } from '../types/caliper';
import { IN_TO_MM, MICROMETER_SCALE_CONFIGS, UNITS_PER_MM } from '../utils/metrology';

interface MicrometerSVGProps {
  reading: VernierReading;
  mode: MicrometerScaleMode;
  isLocked: boolean;
  showGuide: boolean;
  specimen: Specimen | null;
  isDraggingSlider: boolean;
}

// World coordinate system (10 units = 1 mm)
// Anvil measuring face at x = 0; Spindle measuring face at x = jawX
export const SLEEVE_ZERO_X = 560; // Sleeve "0" mark sits at x = 560

export const MICROMETER_BOUNDS = {
  minX: -220,
  maxX: 1380,
  minY: -220,
  maxY: 430,
};

export const MicrometerSVG: React.FC<MicrometerSVGProps> = ({
  reading,
  mode,
  isLocked,
  showGuide,
  specimen,
  isDraggingSlider,
}) => {
  const cfg = MICROMETER_SCALE_CONFIGS[mode];
  const jawX = reading.positionMm * UNITS_PER_MM;

  // Generate Sleeve Main Scale (MSR) ticks
  const sleeveTicks = useMemo(() => {
    const items: {
      key: string;
      x: number;
      isTop: boolean;
      height: number;
      strokeWidth: number;
      label?: string;
    }[] = [];

    if (mode === 'micro-001-mm') {
      // 0 to 25 mm in 0.5 mm pitch steps
      for (let half = 0; half <= 50; half++) {
        const mm = half * 0.5;
        const isWhole = half % 2 === 0;
        const isFive = half % 10 === 0;
        items.push({
          key: `m-${half}`,
          x: SLEEVE_ZERO_X + mm * UNITS_PER_MM,
          isTop: isWhole,
          height: isWhole ? (isFive ? 36 : 24) : 20,
          strokeWidth: isFive ? 1.8 : 1.15,
          label: isFive ? String(mm) : undefined,
        });
      }
    } else {
      // Imperial: 0 to 1.000 in in 0.025 in steps
      for (let t = 0; t <= 40; t++) {
        const inches = t * 0.025;
        const isTenth = t % 4 === 0;
        items.push({
          key: `in-${t}`,
          x: SLEEVE_ZERO_X + inches * IN_TO_MM * UNITS_PER_MM,
          isTop: true,
          height: isTenth ? 36 : 22,
          strokeWidth: isTenth ? 1.8 : 1.15,
          label: isTenth ? String(t / 4) : undefined,
        });
      }
    }
    return items;
  }, [mode]);

  // Cylindrical 3D projection of rotating Circular Scale (CSR) ticks on thimble bevel
  const circularTicks = useMemo(() => {
    const divs = cfg.circularDivisions;
    const pitchMm = cfg.pitchMm;
    const phase = (reading.positionMm / pitchMm) * divs;
    const radius = 84;

    const visible: {
      index: number;
      y: number;
      cos: number;
      isMajor: boolean;
      label?: string;
    }[] = [];

    for (let i = 0; i < divs; i++) {
      let diff = i - phase;
      // Wrap diff into [-divs/2, +divs/2]
      diff = ((diff % divs) + divs) % divs;
      if (diff > divs / 2) diff -= divs;

      const theta = (diff / divs) * Math.PI * 2;
      const cos = Math.cos(theta);
      if (cos <= 0.08) continue;

      const y = -radius * Math.sin(theta);
      const isMajor = i % 5 === 0;
      visible.push({
        index: i,
        y,
        cos,
        isMajor,
        label: isMajor ? String(i) : undefined,
      });
    }
    return visible;
  }, [cfg.circularDivisions, cfg.pitchMm, reading.positionMm]);

  const sleeveEndX = SLEEVE_ZERO_X + 310;

  return (
    <g>
      <defs>
        {/* Cylindrical chrome shading along vertical Y axis */}
        <linearGradient id="micro-cyl-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#828E9E" />
          <stop offset="14%" stopColor="#CBD4DF" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="46%" stopColor="#EEF2F7" />
          <stop offset="68%" stopColor="#B8C3D0" />
          <stop offset="88%" stopColor="#8B97A7" />
          <stop offset="100%" stopColor="#657181" />
        </linearGradient>

        {/* Tapered conical thimble bevel chrome gradient */}
        <linearGradient id="micro-bevel-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94A0AE" />
          <stop offset="22%" stopColor="#EBF0F6" />
          <stop offset="36%" stopColor="#FFFFFF" />
          <stop offset="64%" stopColor="#CBD5E1" />
          <stop offset="90%" stopColor="#8A96A6" />
          <stop offset="100%" stopColor="#6A7686" />
        </linearGradient>

        {/* Satin-chrome forged C-frame gradient */}
        <linearGradient id="micro-frame-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="28%" stopColor="#DCE3EC" />
          <stop offset="56%" stopColor="#B8C2CF" />
          <stop offset="80%" stopColor="#E4EAF1" />
          <stop offset="100%" stopColor="#8F9BA9" />
        </linearGradient>

        {/* Insulated dark enamel grip plate */}
        <linearGradient id="micro-grip-pad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2B333E" />
          <stop offset="50%" stopColor="#1B2129" />
          <stop offset="100%" stopColor="#10141A" />
        </linearGradient>

        {/* Knurled dark ratchet stop */}
        <linearGradient id="micro-ratchet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B5563" />
          <stop offset="30%" stopColor="#94A3B8" />
          <stop offset="55%" stopColor="#334155" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        <filter id="micro-shadow" x="-6%" y="-10%" width="114%" height="125%">
          <feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#090D16" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* ============================================================
          1. SPINDLE & THIMBLE ASSEMBLY (Translates along X by jawX)
          ============================================================ */}
      <g
        data-caliper-slider="true"
        transform={`translate(${jawX}, 0)`}
        style={{ cursor: isLocked ? 'grab' : isDraggingSlider ? 'grabbing' : 'ew-resize' }}
      >
        {/* Spindle shaft (extends from measuring face x=0 into sleeve) */}
        <rect
          data-caliper-slider="true"
          x={0}
          y={-28}
          width={SLEEVE_ZERO_X + 20}
          height={56}
          fill="url(#micro-cyl-chrome)"
          stroke="#525E6E"
          strokeWidth={1.6}
        />
        {/* Carbide tip on spindle face */}
        <rect
          data-caliper-slider="true"
          x={0}
          y={-28}
          width={14}
          height={56}
          fill="#64748B"
          stroke="#1E293B"
          strokeWidth={1.4}
        />
        <line data-caliper-slider="true" x1={0} y1={-28} x2={0} y2={28} stroke="#0F141B" strokeWidth={2} />
      </g>

      {/* ============================================================
          2. FIXED C-FRAME, ANVIL & SLEEVE (MSR Barrel)
          ============================================================ */}
      <g filter="url(#micro-shadow)">
        {/* Forged Chrome C-Frame sweeping cleanly underneath measurement gap */}
        <path
          d={`
            M -135 -48
            L -42 -48
            L -42 52
            C -42 98, -14 148, 22 184
            C 72 232, 138 250, 210 250
            C 288 250, 345 224, 385 162
            C 406 128, 412 86, 412 58
            L 486 58
            L 486 -58
            L 348 -58
            C 340 -12, 336 42, 318 90
            C 295 148, 255 178, 202 178
            C 138 178, 76 146, 42 94
            C 24 64, 18 42, 18 38
            L -92 38
            C -126 38, -158 14, -158 -10
            C -158 -36, -148 -48, -135 -48
            Z
          `}
          fill="url(#micro-frame-chrome)"
          stroke="#475569"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Enamel insulated grip plate inset on C-Frame */}
        <path
          d={`
            M 38 148
            C 78 206, 140 232, 208 232
            C 278 232, 332 204, 366 142
            C 350 132, 334 128, 320 144
            C 294 176, 252 198, 202 198
            C 142 198, 86 168, 52 126
            Z
          `}
          fill="url(#micro-grip-pad)"
          stroke="#64748B"
          strokeWidth={1.2}
        />

        {/* Engraved capacity text on C-Frame grip */}
        <text
          x={208}
          y={216}
          textAnchor="middle"
          fill="#E2E8F0"
          fontFamily="JetBrains Mono, monospace"
          fontWeight={600}
          fontSize={14}
          letterSpacing="0.06em"
        >
          {mode === 'micro-001-mm' ? '0–25 mm · 0.01 mm' : '0–1 in · 0.001 in'}
        </text>

        {/* Fixed Anvil + Carbide measuring face at x = 0 */}
        <rect
          x={-42}
          y={-28}
          width={42}
          height={56}
          fill="url(#micro-cyl-chrome)"
          stroke="#475569"
          strokeWidth={1.6}
        />
        <rect x={-14} y={-28} width={14} height={56} fill="#64748B" stroke="#1E293B" strokeWidth={1.4} />
        <line x1={0} y1={-28} x2={0} y2={28} stroke="#0F141B" strokeWidth={2} />

        {/* Spindle Lock Collar / Lever on Frame Boss */}
        <g transform="translate(446, 0)">
          <rect x={-18} y={-64} width={36} height={128} rx={4} fill="url(#micro-cyl-chrome)" stroke="#475569" strokeWidth={1.5} />
          <rect
            x={-10}
            y={isLocked ? -112 : -92}
            width={20}
            height={48}
            rx={6}
            fill={isLocked ? '#EA4B1E' : '#334155'}
            stroke="#0F141B"
            strokeWidth={1.4}
          />
        </g>

        {/* Fixed Sleeve / Barrel (MSR) */}
        <rect
          x={484}
          y={-58}
          width={sleeveEndX - 484}
          height={116}
          fill="url(#micro-cyl-chrome)"
          stroke="#475569"
          strokeWidth={1.8}
        />

        {/* Horizontal Datum Line along Sleeve */}
        <line
          x1={SLEEVE_ZERO_X - 16}
          y1={0}
          x2={sleeveEndX - 4}
          y2={0}
          stroke="#0F141B"
          strokeWidth={1.8}
        />

        {/* Sleeve MSR Ticks & Labels */}
        {sleeveTicks.map((t) => (
          <g key={t.key}>
            <line
              x1={t.x}
              y1={0}
              x2={t.x}
              y2={t.isTop ? -t.height : t.height}
              stroke="#0F141B"
              strokeWidth={t.strokeWidth}
            />
            {t.label !== undefined && (
              <text
                x={t.x}
                y={-41}
                textAnchor="middle"
                fill="#0F141B"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
                fontSize={13}
              >
                {t.label}
              </text>
            )}
          </g>
        ))}
      </g>

      {/* ============================================================
          3. OPTIONAL SPECIMEN (Between Anvil x=0 & Spindle x=jawX)
          ============================================================ */}
      {specimen && specimen.kind === 'outside' && (
        <g pointerEvents="none">
          {specimen.id === 'bearing' ? (
            (() => {
              const d = specimen.dimensionMm * UNITS_PER_MM;
              const r = d / 2;
              return (
                <g>
                  <circle cx={r} cy={0} r={r} fill="url(#micro-frame-chrome)" stroke="#334155" strokeWidth={1.8} />
                  <circle cx={r} cy={0} r={r * 0.7} fill="#CBD5E1" stroke="#475569" strokeWidth={1.2} />
                  <circle cx={r} cy={0} r={r * 0.42} fill="#F1F5F9" stroke="#334155" strokeWidth={1.5} />
                  <line x1={0} y1={-18} x2={0} y2={18} stroke="#EA4B1E" strokeWidth={2} />
                  <line x1={d} y1={-18} x2={d} y2={18} stroke="#EA4B1E" strokeWidth={2} strokeOpacity={Math.abs(jawX - d) < 1 ? 1 : 0.35} />
                </g>
              );
            })()
          ) : (
            (() => {
              const d = specimen.dimensionMm * UNITS_PER_MM;
              return (
                <g>
                  <rect x={0} y={-44} width={d} height={88} rx={Math.min(5, d * 0.18)} fill="url(#micro-frame-chrome)" stroke="#334155" strokeWidth={1.5} />
                  <line x1={0} y1={-22} x2={0} y2={22} stroke="#EA4B1E" strokeWidth={2} />
                  <line x1={d} y1={-22} x2={d} y2={22} stroke="#EA4B1E" strokeWidth={2} strokeOpacity={Math.abs(jawX - d) < 1 ? 1 : 0.35} />
                </g>
              );
            })()
          )}
        </g>
      )}

      {/* ============================================================
          4. ROTATING CHROME THIMBLE & RATCHET STOP (CSR Drum)
          ============================================================ */}
      <g
        data-caliper-slider="true"
        transform={`translate(${jawX}, 0)`}
        style={{ cursor: isLocked ? 'grab' : isDraggingSlider ? 'grabbing' : 'ew-resize' }}
      >
        {/* Generous invisible pointer hit area covering thimble + spindle */}
        <rect
          data-caliper-slider="true"
          x={-16}
          y={-110}
          width={1060}
          height={220}
          fill="transparent"
        />

        {/* Beveled conical thimble nose meeting Sleeve MSR right at x = SLEEVE_ZERO_X */}
        <path
          data-caliper-slider="true"
          d={`
            M ${SLEEVE_ZERO_X} -62
            L ${SLEEVE_ZERO_X + 95} -88
            L ${SLEEVE_ZERO_X + 95} 88
            L ${SLEEVE_ZERO_X} 62
            Z
          `}
          fill="url(#micro-bevel-chrome)"
          stroke="#475569"
          strokeWidth={1.7}
          strokeLinejoin="round"
        />

        {/* Main Thimble Cylinder */}
        <rect
          data-caliper-slider="true"
          x={SLEEVE_ZERO_X + 95}
          y={-88}
          width={295}
          height={176}
          rx={3}
          fill="url(#micro-cyl-chrome)"
          stroke="#475569"
          strokeWidth={1.7}
        />

        {/* Knurled Thimble Grip Band */}
        <rect
          data-caliper-slider="true"
          x={SLEEVE_ZERO_X + 205}
          y={-84}
          width={170}
          height={168}
          fill="#1E2530"
          fillOpacity={0.14}
          stroke="#64748B"
          strokeWidth={1}
        />
        {Array.from({ length: 16 }).map((_, idx) => {
          const kx = SLEEVE_ZERO_X + 214 + idx * 10;
          return (
            <line
              key={idx}
              data-caliper-slider="true"
              x1={kx}
              y1={-82}
              x2={kx}
              y2={82}
              stroke="#334155"
              strokeOpacity={0.4}
              strokeWidth={1.4}
            />
          );
        })}

        {/* Ratchet Stop End Cap */}
        <rect
          data-caliper-slider="true"
          x={SLEEVE_ZERO_X + 390}
          y={-42}
          width={92}
          height={84}
          rx={8}
          fill="url(#micro-ratchet)"
          stroke="#1E293B"
          strokeWidth={1.6}
        />
        <rect
          data-caliper-slider="true"
          x={SLEEVE_ZERO_X + 482}
          y={-28}
          width={22}
          height={56}
          rx={4}
          fill="url(#micro-cyl-chrome)"
          stroke="#334155"
          strokeWidth={1.4}
        />

        {/* Circular Scale Ticks & Numerals (3D cylindrical projection on beveled nose) */}
        {circularTicks.map((tick) => {
          const isCoinciding = tick.index === reading.coincidingTick;
          const highlighted = showGuide && isCoinciding;
          const tickLen = tick.isMajor ? 36 : 22;
          const opacity = Math.max(0.22, Math.min(1, tick.cos * 1.15));
          const scaleY = Math.max(0.45, tick.cos);

          return (
            <g
              key={tick.index}
              data-caliper-slider="true"
              opacity={opacity}
            >
              <line
                data-caliper-slider="true"
                x1={SLEEVE_ZERO_X + 2}
                y1={tick.y * 0.72}
                x2={SLEEVE_ZERO_X + tickLen}
                y2={tick.y * 0.72}
                stroke={highlighted ? '#EA4B1E' : '#0F141B'}
                strokeWidth={(highlighted ? 2.4 : tick.isMajor ? 1.8 : 1.1) * scaleY}
              />
              {tick.label !== undefined && (
                <text
                  data-caliper-slider="true"
                  x={SLEEVE_ZERO_X + 44}
                  y={tick.y * 0.72 + 5 * scaleY}
                  fill={highlighted ? '#EA4B1E' : '#0F141B'}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={highlighted ? 700 : 600}
                  fontSize={14 * scaleY}
                >
                  {tick.label}
                </text>
              )}
            </g>
          );
        })}

        {isDraggingSlider && (
          <rect
            data-caliper-slider="true"
            x={SLEEVE_ZERO_X}
            y={-88}
            width={390}
            height={176}
            fill="none"
            stroke="#EA4B1E"
            strokeOpacity={0.45}
            strokeWidth={1.8}
            pointerEvents="none"
          />
        )}
      </g>

      {/* ============================================================
          5. OPTIONAL ALIGNMENT GUIDE ON DATUM LINE
          ============================================================ */}
      {showGuide && (
        <g pointerEvents="none">
          <line
            x1={SLEEVE_ZERO_X + jawX - 30}
            y1={0}
            x2={SLEEVE_ZERO_X + jawX + 42}
            y2={0}
            stroke="#EA4B1E"
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          <circle cx={SLEEVE_ZERO_X + jawX} cy={0} r={3.6} fill="#EA4B1E" />
        </g>
      )}
    </g>
  );
};
