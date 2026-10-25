import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TooltipSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  accentColor?: 'amber' | 'cyan' | 'indigo' | 'emerald';
  minLabel?: string;
  maxLabel?: string;
  label?: string;
}

export const TooltipSlider: React.FC<TooltipSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  formatValue = (v) => v.toString(),
  accentColor = 'indigo',
  minLabel,
  maxLabel,
  label,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [cursorPct, setCursorPct] = useState<number>(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const trackRectRef = useRef<DOMRect | null>(null);
  const lastEmittedValueRef = useRef<number>(value);

  // Sync ref with external value changes
  useEffect(() => {
    lastEmittedValueRef.current = value;
  }, [value]);

  // Snap a raw value to the step
  const snapToStep = useCallback(
    (rawVal: number) => {
      const clamped = Math.max(min, Math.min(max, rawVal));
      const steps = Math.round((clamped - min) / step);
      const stepped = min + steps * step;
      const precision = (step.toString().split('.')[1] || '').length;
      return parseFloat(stepped.toFixed(precision));
    },
    [min, max, step]
  );

  // Cache track bounding rect to avoid layout reflow on every mousemove
  const updateRect = () => {
    if (trackRef.current) {
      trackRectRef.current = trackRef.current.getBoundingClientRect();
    }
  };

  const handlePointerEnter = () => {
    updateRect();
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setIsHovered(false);
      setHoverValue(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    updateRect();
    setIsDragging(true);

    const rect = trackRectRef.current;
    if (!rect || rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentPct = ratio * 100;
    setCursorPct(currentPct);

    const stepped = snapToStep(min + ratio * (max - min));
    setHoverValue(stepped);
    if (lastEmittedValueRef.current !== stepped) {
      lastEmittedValueRef.current = stepped;
      onChange(stepped);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRectRef.current) updateRect();
    const rect = trackRectRef.current;
    if (!rect || rect.width <= 0) return;

    // Continuous ratio for 60fps silky smooth floating bubble tracking
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentPct = ratio * 100;
    setCursorPct(currentPct);

    // Stepped value for the label
    const stepped = snapToStep(min + ratio * (max - min));
    if (hoverValue !== stepped) {
      setHoverValue(stepped);
    }

    if (isDragging) {
      if (lastEmittedValueRef.current !== stepped) {
        lastEmittedValueRef.current = stepped;
        onChange(stepped);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    if (!isHovered) {
      setHoverValue(null);
    }
  };

  // Value percentage for the active thumb and active track fill
  const valuePct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));

  // Bubble position:
  // When dragging, it centers over the thumb (valuePct).
  // When hovering (not dragging), it smoothly tracks the mouse cursor continuously (cursorPct)!
  const bubblePct = isDragging ? valuePct : cursorPct;
  const bubbleDisplayValue = isDragging || hoverValue === null ? value : hoverValue;
  const showBubble = isHovered || isDragging;

  const colorStyles = {
    indigo: {
      track: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
      thumb: 'border-indigo-400 bg-white shadow-indigo-500/50',
      bubble: 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/50',
      arrow: 'border-t-indigo-600',
      preview: 'bg-indigo-400/30',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    amber: {
      track: 'bg-gradient-to-r from-amber-600 to-amber-400',
      thumb: 'border-amber-400 bg-white shadow-amber-500/50',
      bubble: 'bg-amber-600 border-amber-400 text-white shadow-amber-900/50',
      arrow: 'border-t-amber-600',
      preview: 'bg-amber-400/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    cyan: {
      track: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
      thumb: 'border-cyan-400 bg-white shadow-cyan-500/50',
      bubble: 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-900/50',
      arrow: 'border-t-cyan-600',
      preview: 'bg-cyan-400/30',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    emerald: {
      track: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
      thumb: 'border-emerald-400 bg-white shadow-emerald-500/50',
      bubble: 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/50',
      arrow: 'border-t-emerald-600',
      preview: 'bg-emerald-400/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  }[accentColor];

  return (
    <div className="w-full select-none py-1">
      {/* Top Label & live Badge */}
      {label && (
        <div className="flex justify-between items-center text-slate-300 mb-1.5">
          <span className="font-medium text-[11px]">{label}</span>
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border shadow-inner ${colorStyles.badge}`}>
            {formatValue(value)}
          </span>
        </div>
      )}

      {/* Interactive Slider Area (GPU-accelerated, zero-stutter pointer events) */}
      <div
        ref={trackRef}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full pt-7 pb-2 cursor-pointer touch-none"
      >
        {/* 1. FLOATING BUBBLE TOOLTIP (Continuous 60fps tracking without discrete jumps) */}
        <div
          style={{
            left: `${bubblePct}%`,
            willChange: 'left',
          }}
          className={`absolute top-0 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center transition-opacity duration-100 ${
            showBubble ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shadow-lg border backdrop-blur-md ${colorStyles.bubble} whitespace-nowrap`}>
            {formatValue(bubbleDisplayValue)}
          </div>
          <div className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 ${colorStyles.arrow}`} />
        </div>

        {/* 2. SLIDER TRACK CONTAINER */}
        <div className="relative w-full h-2 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden shadow-inner">
          {/* Active Filled Track */}
          <div
            style={{ width: `${valuePct}%` }}
            className={`h-full ${colorStyles.track} rounded-full`}
          />

          {/* Hover Preview Bar when sliding mouse over the track */}
          {isHovered && !isDragging && hoverValue !== null && (
            <div
              style={{
                left: `${Math.min(valuePct, cursorPct)}%`,
                width: `${Math.abs(cursorPct - valuePct)}%`,
              }}
              className={`absolute top-0 h-full ${colorStyles.preview} pointer-events-none`}
            />
          )}
        </div>

        {/* 3. VISUAL ACTIVE THUMB KNOB */}
        <div
          style={{
            left: `${valuePct}%`,
            willChange: 'left',
          }}
          className={`absolute top-8 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
            colorStyles.thumb
          } shadow-md pointer-events-none transition-transform duration-100 ${
            isDragging ? 'scale-125 ring-2 ring-white/60' : isHovered ? 'scale-110' : 'scale-100'
          }`}
        />

        {/* 4. HOVER GHOST POINTER (Smooth dot following mouse position when hovering) */}
        {isHovered && !isDragging && hoverValue !== null && hoverValue !== value && (
          <div
            style={{
              left: `${cursorPct}%`,
              willChange: 'left',
            }}
            className="absolute top-8 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/70 bg-white/40 backdrop-blur-xs pointer-events-none"
          />
        )}
      </div>

      {/* 5. MIN / MAX RANGE LABELS */}
      <div className="flex justify-between text-[10px] text-slate-500 font-mono -mt-1">
        <span>{minLabel || `Min: ${min}`}</span>
        <span className="text-slate-400 font-semibold">{formatValue(value)}</span>
        <span>{maxLabel || `Max: ${max}`}</span>
      </div>
    </div>
  );
};
