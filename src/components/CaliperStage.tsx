import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  AnyScaleMode,
  CameraState,
  InstrumentType,
  MicrometerScaleMode,
  ScaleMode,
  Specimen,
  VernierReading,
} from '../types/caliper';
import { CALIPER_SCALE_CONFIGS, UNITS_PER_MM } from '../utils/metrology';
import { CALIPER_BOUNDS, CaliperSVG, SCALE_ORIGIN_X } from './CaliperSVG';
import { MICROMETER_BOUNDS, MicrometerSVG, SLEEVE_ZERO_X } from './MicrometerSVG';

export interface CaliperStageHandle {
  fitToScreen: () => void;
  zoomToScale: () => void;
  zoomBy: (factor: number) => void;
}

interface CaliperStageProps {
  instrument: InstrumentType;
  reading: VernierReading;
  mode: AnyScaleMode;
  isLocked: boolean;
  showGuide: boolean;
  specimen: Specimen | null;
  onRawPositionChange: (rawMm: number) => void;
  onZoomRatioChange?: (ratio: number) => void;
}

interface ActivePointer {
  x: number;
  y: number;
}

export const CaliperStage = React.forwardRef<CaliperStageHandle, CaliperStageProps>(
  (
    {
      instrument,
      reading,
      mode,
      isLocked,
      showGuide,
      specimen,
      onRawPositionChange,
      onZoomRatioChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 0.25 });
    const cameraRef = useRef<CameraState>(camera);
    const fitScaleRef = useRef<number>(0.25);
    const hasInitializedRef = useRef(false);
    const prevInstrumentRef = useRef<InstrumentType>(instrument);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);

    const bounds = instrument === 'micrometer' ? MICROMETER_BOUNDS : CALIPER_BOUNDS;

    const updateCamera = useCallback(
      (next: CameraState) => {
        cameraRef.current = next;
        setCamera(next);
        onZoomRatioChange?.(next.scale / fitScaleRef.current);
      },
      [onZoomRatioChange]
    );

    const getStageSize = useCallback(() => {
      const el = containerRef.current;
      if (!el) return { width: window.innerWidth, height: window.innerHeight * 0.7 };
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }, []);

    const computeFitCamera = useCallback((): CameraState => {
      const { width, height } = getStageSize();
      const b = instrument === 'micrometer' ? MICROMETER_BOUNDS : CALIPER_BOUNDS;
      const worldW = b.maxX - b.minX;
      const worldH = b.maxY - b.minY;
      const padX = width < 640 ? 24 : 96;
      const padY = width < 640 ? 104 : 132;

      const scale = Math.max(0.08, Math.min((width - padX) / worldW, (height - padY) / worldH));
      fitScaleRef.current = scale;

      const worldCenterX = (b.minX + b.maxX) / 2;
      const worldCenterY = (b.minY + b.maxY) / 2;

      return {
        scale,
        x: width / 2 - worldCenterX * scale,
        y: height / 2 - worldCenterY * scale + (width < 640 ? 14 : 20),
      };
    }, [getStageSize, instrument]);

    const animFrameRef = useRef<number | null>(null);
    const cancelAnimation = useCallback(() => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }, []);

    const animateCameraTo = useCallback(
      (target: CameraState, durationMs = 240) => {
        cancelAnimation();
        const start = { ...cameraRef.current };
        const startTime = performance.now();

        const step = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / durationMs);
          const ease = 1 - Math.pow(1 - t, 3);
          updateCamera({
            x: start.x + (target.x - start.x) * ease,
            y: start.y + (target.y - start.y) * ease,
            scale: start.scale + (target.scale - start.scale) * ease,
          });
          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            animFrameRef.current = null;
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
      },
      [cancelAnimation, updateCamera]
    );

    const clampCamera = useCallback(
      (next: CameraState): CameraState => {
        const minScale = fitScaleRef.current * 0.65;
        const maxScale = fitScaleRef.current * 14;
        const scale = Math.max(minScale, Math.min(maxScale, next.scale));

        const { width, height } = getStageSize();
        const minX = width * 0.15 - (bounds.maxX + 400) * scale;
        const maxX = width * 0.85 - bounds.minX * scale;
        const minY = height * 0.15 - bounds.maxY * scale;
        const maxY = height * 0.85 - bounds.minY * scale;

        return {
          scale,
          x: Math.max(minX, Math.min(maxX, next.x)),
          y: Math.max(minY, Math.min(maxY, next.y)),
        };
      },
      [bounds, getStageSize]
    );

    const fitToScreen = useCallback(() => {
      const target = computeFitCamera();
      animateCameraTo(target, 240);
    }, [animateCameraTo, computeFitCamera]);

    const zoomToScale = useCallback(() => {
      const { width, height } = getStageSize();
      const jawX = reading.positionMm * UNITS_PER_MM;

      if (instrument === 'micrometer') {
        const focusWorldX = SLEEVE_ZERO_X + jawX - 30;
        const focusWorldY = 0;
        const desiredScale = Math.min(
          fitScaleRef.current * 12,
          Math.max(fitScaleRef.current * 3.2, (width * 0.84) / 360)
        );
        animateCameraTo(
          clampCamera({
            scale: desiredScale,
            x: width / 2 - focusWorldX * desiredScale,
            y: height / 2 - focusWorldY * desiredScale,
          }),
          260
        );
        return;
      }

      const calMode: ScaleMode =
        mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002';
      const cfg = CALIPER_SCALE_CONFIGS[calMode];
      const focusWorldX = SCALE_ORIGIN_X + jawX + cfg.vernierSpanUnits * 0.44;
      const focusWorldY = calMode === 'imperial-001' ? -52 : 52;

      const desiredScale = Math.min(
        fitScaleRef.current * 12,
        Math.max(fitScaleRef.current * 4.4, (width * 0.88) / (cfg.vernierSpanUnits + 120))
      );

      animateCameraTo(
        clampCamera({
          scale: desiredScale,
          x: width / 2 - focusWorldX * desiredScale,
          y: height / 2 - focusWorldY * desiredScale,
        }),
        260
      );
    }, [animateCameraTo, clampCamera, getStageSize, instrument, mode, reading.positionMm]);

    const zoomBy = useCallback(
      (factor: number) => {
        const { width, height } = getStageSize();
        const cur = cameraRef.current;
        const nextScale = cur.scale * factor;
        const clamped = clampCamera({
          scale: nextScale,
          x: width / 2 - ((width / 2 - cur.x) / cur.scale) * nextScale,
          y: height / 2 - ((height / 2 - cur.y) / cur.scale) * nextScale,
        });
        animateCameraTo(clamped, 160);
      },
      [animateCameraTo, clampCamera, getStageSize]
    );

    useImperativeHandle(
      ref,
      () => ({
        fitToScreen,
        zoomToScale,
        zoomBy,
      }),
      [fitToScreen, zoomBy, zoomToScale]
    );

    // Fit cleanly when mounting or switching between Caliper & Screw Gauge
    useEffect(() => {
      if (prevInstrumentRef.current !== instrument) {
        prevInstrumentRef.current = instrument;
        updateCamera(computeFitCamera());
      }
    }, [computeFitCamera, instrument, updateCamera]);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const handleResize = () => {
        const prevFit = fitScaleRef.current;
        const fitted = computeFitCamera();
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          updateCamera(fitted);
        } else {
          const ratio = cameraRef.current.scale / prevFit;
          if (Math.abs(ratio - 1) < 0.08) {
            updateCamera(fitted);
          }
        }
      };

      handleResize();
      const observer = new ResizeObserver(handleResize);
      observer.observe(el);
      return () => observer.disconnect();
    }, [computeFitCamera, updateCamera]);

    const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
    const gestureRef = useRef<{
      mode: 'none' | 'pan' | 'slider' | 'pinch';
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      startJawMm: number;
      startTime: number;
      startPinchDist: number;
      startPinchMidX: number;
      startPinchMidY: number;
      startCamera: CameraState;
      movedDistance: number;
    }>({
      mode: 'none',
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startJawMm: 0,
      startTime: 0,
      startPinchDist: 1,
      startPinchMidX: 0,
      startPinchMidY: 0,
      startCamera: { x: 0, y: 0, scale: 0.25 },
      movedDistance: 0,
    });

    const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
    const readingPosRef = useRef(reading.positionMm);
    readingPosRef.current = reading.positionMm;

    const getLocalCoords = (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      cancelAnimation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }

      const pt = getLocalCoords(e.clientX, e.clientY);
      pointersRef.current.set(e.pointerId, pt);

      const targetEl = e.target as HTMLElement | SVGElement | null;
      const hitSlider = Boolean(targetEl?.closest?.('[data-caliper-slider="true"]'));

      if (pointersRef.current.size === 1) {
        const dragMode = hitSlider && !isLocked ? 'slider' : 'pan';
        setIsDraggingSlider(dragMode === 'slider');
        gestureRef.current = {
          mode: dragMode,
          startX: pt.x,
          startY: pt.y,
          lastX: pt.x,
          lastY: pt.y,
          startJawMm: readingPosRef.current,
          startTime: performance.now(),
          startPinchDist: 1,
          startPinchMidX: pt.x,
          startPinchMidY: pt.y,
          startCamera: { ...cameraRef.current },
          movedDistance: 0,
        };
      } else if (pointersRef.current.size === 2) {
        if (
          gestureRef.current.mode === 'slider' &&
          performance.now() - gestureRef.current.startTime < 120
        ) {
          onRawPositionChange(gestureRef.current.startJawMm);
        }
        setIsDraggingSlider(false);

        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        gestureRef.current = {
          ...gestureRef.current,
          mode: 'pinch',
          startPinchDist: Math.max(10, dist),
          startPinchMidX: midX,
          startPinchMidY: midY,
          startCamera: { ...cameraRef.current },
          movedDistance: 999,
        };
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const pt = getLocalCoords(e.clientX, e.clientY);
      pointersRef.current.set(e.pointerId, pt);

      const g = gestureRef.current;

      if (pointersRef.current.size >= 2 && g.mode === 'pinch') {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const scaleFactor = dist / g.startPinchDist;
        const rawScale = g.startCamera.scale * scaleFactor;
        const worldAnchorX = (g.startPinchMidX - g.startCamera.x) / g.startCamera.scale;
        const worldAnchorY = (g.startPinchMidY - g.startCamera.y) / g.startCamera.scale;

        const next = clampCamera({
          scale: rawScale,
          x: midX - worldAnchorX * rawScale,
          y: midY - worldAnchorY * rawScale,
        });

        const finalScale = next.scale;
        updateCamera({
          scale: finalScale,
          x: midX - worldAnchorX * finalScale,
          y: midY - worldAnchorY * finalScale,
        });
        return;
      }

      if (pointersRef.current.size === 1) {
        const stepDist = Math.hypot(pt.x - g.lastX, pt.y - g.lastY);
        g.movedDistance += stepDist;

        if (g.mode === 'slider') {
          const totalDx = pt.x - g.startX;
          const totalDy = pt.y - g.startY;
          const deltaMm =
            instrument === 'micrometer'
              ? totalDx / (cameraRef.current.scale * UNITS_PER_MM) +
                totalDy / (cameraRef.current.scale * UNITS_PER_MM * 4)
              : totalDx / (cameraRef.current.scale * UNITS_PER_MM);
          onRawPositionChange(g.startJawMm + deltaMm);
        } else if (g.mode === 'pan') {
          const dx = pt.x - g.lastX;
          const dy = pt.y - g.lastY;
          updateCamera(
            clampCamera({
              scale: cameraRef.current.scale,
              x: cameraRef.current.x + dx,
              y: cameraRef.current.y + dy,
            })
          );
        }

        g.lastX = pt.x;
        g.lastY = pt.y;
      }
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const pt = getLocalCoords(e.clientX, e.clientY);
      pointersRef.current.delete(e.pointerId);

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }

      const g = gestureRef.current;

      if (pointersRef.current.size === 0 && g.movedDistance < 10) {
        const now = performance.now();
        const dt = now - lastTapRef.current.time;
        const dd = Math.hypot(pt.x - lastTapRef.current.x, pt.y - lastTapRef.current.y);
        if (dt < 290 && dd < 32) {
          lastTapRef.current = { time: 0, x: 0, y: 0 };
          const ratio = cameraRef.current.scale / fitScaleRef.current;
          if (ratio > 1.8) {
            fitToScreen();
          } else {
            const { width, height } = getStageSize();
            const targetScale = Math.min(fitScaleRef.current * 10, fitScaleRef.current * 4.2);
            const worldX = (pt.x - cameraRef.current.x) / cameraRef.current.scale;
            const worldY = (pt.y - cameraRef.current.y) / cameraRef.current.scale;
            animateCameraTo(
              clampCamera({
                scale: targetScale,
                x: width / 2 - worldX * targetScale,
                y: height / 2 - worldY * targetScale,
              }),
              240
            );
          }
        } else {
          lastTapRef.current = { time: now, x: pt.x, y: pt.y };
        }
      }

      if (pointersRef.current.size === 1) {
        const [rem] = Array.from(pointersRef.current.values());
        setIsDraggingSlider(false);
        gestureRef.current = {
          ...gestureRef.current,
          mode: 'pan',
          startX: rem.x,
          startY: rem.y,
          lastX: rem.x,
          lastY: rem.y,
          movedDistance: 999,
        };
      } else if (pointersRef.current.size === 0) {
        setIsDraggingSlider(false);
        gestureRef.current.mode = 'none';
      }
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        cancelAnimation();

        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const zoomIntensity = e.ctrlKey ? 0.01 : 0.0018;
        const factor = Math.exp(-e.deltaY * zoomIntensity);

        const cur = cameraRef.current;
        const nextScale = Math.max(
          fitScaleRef.current * 0.65,
          Math.min(fitScaleRef.current * 14, cur.scale * factor)
        );
        const worldX = (mx - cur.x) / cur.scale;
        const worldY = (my - cur.y) / cur.scale;

        updateCamera(
          clampCamera({
            scale: nextScale,
            x: mx - worldX * nextScale,
            y: my - worldY * nextScale,
          })
        );
      };

      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }, [cancelAnimation, clampCamera, updateCamera]);

    const calMode: ScaleMode =
      mode === 'metric-005' || mode === 'imperial-001' ? mode : 'metric-002';
    const microMode: MicrometerScaleMode =
      mode === 'micro-001-in' ? 'micro-001-in' : 'micro-001-mm';

    return (
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className="relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing studio-grid"
        role="application"
        aria-label={
          instrument === 'micrometer'
            ? 'Interactive Screw Gauge Stage'
            : 'Interactive Vernier Caliper Stage'
        }
      >
        <svg className="w-full h-full block" aria-hidden="true">
          <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
            {instrument === 'micrometer' ? (
              <MicrometerSVG
                reading={reading}
                mode={microMode}
                isLocked={isLocked}
                showGuide={showGuide}
                specimen={specimen}
                isDraggingSlider={isDraggingSlider}
              />
            ) : (
              <CaliperSVG
                reading={reading}
                mode={calMode}
                isLocked={isLocked}
                showGuide={showGuide}
                specimen={specimen}
                isDraggingSlider={isDraggingSlider}
              />
            )}
          </g>
        </svg>
      </div>
    );
  }
);

CaliperStage.displayName = 'CaliperStage';
