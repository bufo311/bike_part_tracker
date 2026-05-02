import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BikeComponent, BikeComponentComponentType } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BikeVisualizerProps {
  components: BikeComponent[];
  onSelectComponent: (type: BikeComponentComponentType) => void;
  themeIndex?: number;
  onThemeChange?: (idx: number) => void;
}

// ── THEMES ──────────────────────────────────────────────────────────────────
type HandlebarStyle = "road" | "mountain" | "city";

interface BikeTheme {
  name: string;
  // frame: [mainTube, topTube, seatStay]
  frame: [string, string, string];
  frameAccent: string; // seat tube / fork
  wheel: string;
  wheelDark: string;
  saddle: string;
  chain: string;
  chainring: string;
  handlebar: HandlebarStyle;
}

const THEMES: BikeTheme[] = [
  {
    name: "Cherry",
    frame: ["#f87171", "#fca5a5", "#f9a8a8"],
    frameAccent: "#ef4444",
    wheel: "#2563eb", wheelDark: "#1d4ed8",
    saddle: "#f97316", chain: "#94a3b8", chainring: "#2563eb",
    handlebar: "road",
  },
  {
    name: "Ocean",
    frame: ["#0ea5e9", "#38bdf8", "#7dd3fc"],
    frameAccent: "#0284c7",
    wheel: "#1e3a5f", wheelDark: "#172554",
    saddle: "#f59e0b", chain: "#64748b", chainring: "#1e3a5f",
    handlebar: "road",
  },
  {
    name: "Forest",
    frame: ["#16a34a", "#4ade80", "#86efac"],
    frameAccent: "#15803d",
    wheel: "#78350f", wheelDark: "#451a03",
    saddle: "#d97706", chain: "#a16207", chainring: "#78350f",
    handlebar: "mountain",
  },
  {
    name: "Sunset",
    frame: ["#ea580c", "#fb923c", "#fed7aa"],
    frameAccent: "#c2410c",
    wheel: "#7c3aed", wheelDark: "#5b21b6",
    saddle: "#fbbf24", chain: "#9ca3af", chainring: "#7c3aed",
    handlebar: "road",
  },
  {
    name: "Candy",
    frame: ["#ec4899", "#f472b6", "#fbcfe8"],
    frameAccent: "#db2777",
    wheel: "#9333ea", wheelDark: "#7e22ce",
    saddle: "#fde047", chain: "#c4b5fd", chainring: "#9333ea",
    handlebar: "city",
  },
  {
    name: "Midnight",
    frame: ["#4338ca", "#6366f1", "#a5b4fc"],
    frameAccent: "#3730a3",
    wheel: "#111827", wheelDark: "#030712",
    saddle: "#fbbf24", chain: "#6b7280", chainring: "#111827",
    handlebar: "road",
  },
  {
    name: "Lemon",
    frame: ["#ca8a04", "#eab308", "#fef08a"],
    frameAccent: "#a16207",
    wheel: "#166534", wheelDark: "#14532d",
    saddle: "#f97316", chain: "#4ade80", chainring: "#166534",
    handlebar: "mountain",
  },
  {
    name: "Arctic",
    frame: ["#bae6fd", "#e0f2fe", "#f0f9ff"],
    frameAccent: "#0ea5e9",
    wheel: "#0369a1", wheelDark: "#075985",
    saddle: "#f9a8d4", chain: "#94a3b8", chainring: "#0369a1",
    handlebar: "city",
  },
  {
    name: "Plum",
    frame: ["#a855f7", "#c084fc", "#e9d5ff"],
    frameAccent: "#9333ea",
    wheel: "#831843", wheelDark: "#500724",
    saddle: "#fde047", chain: "#c084fc", chainring: "#831843",
    handlebar: "road",
  },
  {
    name: "Desert",
    frame: ["#d97706", "#f59e0b", "#fde68a"],
    frameAccent: "#b45309",
    wheel: "#7c2d12", wheelDark: "#431407",
    saddle: "#92400e", chain: "#d6d3d1", chainring: "#7c2d12",
    handlebar: "mountain",
  },
];

// ── HOTSPOTS ─────────────────────────────────────────────────────────────────
interface HotspotDef {
  cx: number; cy: number; r: number;
  label: string; labelX: number; labelY: number;
  anchor: "start" | "middle" | "end";
}

const HOTSPOTS: Record<BikeComponentComponentType, HotspotDef> = {
  rear_tire:          { cx: 84,  cy: 198, r: 32, label: "Rear Tire",     labelX: 20,  labelY: 185, anchor: "start" },
  rear_sealant:       { cx: 40,  cy: 268, r: 28, label: "Rear Sealant",  labelX: 20,  labelY: 260, anchor: "start" },
  rear_brake_pads:    { cx: 78,  cy: 335, r: 26, label: "R. Brake Pads", labelX: 20,  labelY: 350, anchor: "start" },
  rear_brake_rotors:  { cx: 165, cy: 222, r: 26, label: "R. Rotors",     labelX: 175, labelY: 208, anchor: "start" },
  cassette:           { cx: 130, cy: 265, r: 22, label: "Cassette",      labelX: 130, labelY: 298, anchor: "middle" },
  chain:              { cx: 248, cy: 295, r: 28, label: "Chain",         labelX: 248, labelY: 316, anchor: "middle" },
  chainring:          { cx: 295, cy: 265, r: 28, label: "Chainring",     labelX: 295, labelY: 305, anchor: "middle" },
  front_tire:         { cx: 460, cy: 170, r: 32, label: "Front Tire",    labelX: 460, labelY: 154, anchor: "middle" },
  front_sealant:      { cx: 550, cy: 268, r: 28, label: "Front Sealant", labelX: 570, labelY: 260, anchor: "start" },
  front_brake_pads:   { cx: 420, cy: 182, r: 26, label: "F. Brake Pads", labelX: 400, labelY: 170, anchor: "end" },
  front_brake_rotors: { cx: 505, cy: 222, r: 26, label: "F. Rotors",    labelX: 570, labelY: 208, anchor: "start" },
};

// ── HANDLEBAR PATHS ───────────────────────────────────────────────────────────
function Handlebars({ style, accent }: { style: HandlebarStyle; accent: string }) {
  if (style === "road") {
    // Drop bars: swept down and forward
    return (
      <g>
        <path d="M 400 115 C 430 100 455 100 462 108 C 458 122 448 123 442 116"
          fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" />
        <rect x="392" y="108" width="18" height="40" rx="6" fill={accent} />
      </g>
    );
  }
  if (style === "mountain") {
    // Flat riser bars: horizontal with slight rise, wider
    return (
      <g>
        <line x1="380" y1="108" x2="490" y2="108" stroke={accent} strokeWidth="9" strokeLinecap="round" />
        <line x1="380" y1="108" x2="380" y2="122" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <line x1="490" y1="108" x2="490" y2="122" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <rect x="392" y="110" width="16" height="38" rx="6" fill={accent} />
      </g>
    );
  }
  // city: upright swept-back bars
  return (
    <g>
      <path d="M 390 118 C 390 100 415 95 435 102 C 455 95 475 100 475 118"
        fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" />
      <rect x="392" y="110" width="16" height="40" rx="6" fill={accent} />
    </g>
  );
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export const BikeVisualizer: React.FC<BikeVisualizerProps> = ({
  components, onSelectComponent, themeIndex = 0, onThemeChange,
}) => {
  const [themeIdx, setThemeIdx] = useState<number>(themeIndex);

  // Sync from parent when prop changes (e.g. switching bikes)
  React.useEffect(() => { setThemeIdx(themeIndex); }, [themeIndex]);

  const theme = THEMES[themeIdx % THEMES.length];

  const changeTheme = useCallback((delta: number) => {
    setThemeIdx(prev => {
      const next = (prev + delta + THEMES.length) % THEMES.length;
      onThemeChange?.(next);
      return next;
    });
  }, [onThemeChange]);

  const getStatus = (type: BikeComponentComponentType) =>
    components.find(c => c.componentType === type)?.status ?? null;

  const dotFill = (type: BikeComponentComponentType) => {
    const s = getStatus(type);
    if (!s) return "#cbd5e1";
    if (s === "good") return "#22c55e";
    if (s === "warning") return "#f59e0b";
    return "#ef4444";
  };

  const shouldPulse = (type: BikeComponentComponentType) => getStatus(type) === "replace";

  const Spokes = ({ cx, cy, color }: { cx: number; cy: number; color: string }) =>
    Array.from({ length: 16 }).map((_, i) => {
      const a = (i * Math.PI * 2) / 16;
      return (
        <line key={i} x1={cx} y1={cy}
          x2={cx + 90 * Math.cos(a)} y2={cy + 90 * Math.sin(a)}
          stroke={color} strokeWidth="2" opacity="0.55" />
      );
    });

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-visible py-2">
      <AnimatePresence mode="wait">
        <motion.svg
          key={themeIdx}
          viewBox="0 0 600 390"
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* ── GRASS ── */}
          <ellipse cx="80"  cy="356" rx="28" ry="13" fill="#4ade80" />
          <ellipse cx="108" cy="352" rx="20" ry="11" fill="#22c55e" />
          <ellipse cx="56"  cy="354" rx="18" ry="10" fill="#16a34a" />
          <ellipse cx="450" cy="356" rx="28" ry="13" fill="#4ade80" />
          <ellipse cx="477" cy="352" rx="20" ry="11" fill="#22c55e" />
          <ellipse cx="425" cy="354" rx="18" ry="10" fill="#16a34a" />

          {/* ── REAR WHEEL ── */}
          <circle cx="130" cy="265" r="95" fill="none" stroke={theme.wheel} strokeWidth="14" />
          <Spokes cx={130} cy={265} color={theme.wheel} />
          <circle cx="130" cy="265" r="12" fill={theme.wheel} />
          <circle cx="130" cy="265" r="6"  fill={theme.wheelDark} />

          {/* ── FRONT WHEEL ── */}
          <circle cx="460" cy="265" r="95" fill="none" stroke={theme.wheel} strokeWidth="14" />
          <Spokes cx={460} cy={265} color={theme.wheel} />
          <circle cx="460" cy="265" r="12" fill={theme.wheel} />
          <circle cx="460" cy="265" r="6"  fill={theme.wheelDark} />

          {/* ── FRAME ── */}
          {/* chain stay */}
          <line x1="130" y1="265" x2="295" y2="265" stroke={theme.frame[2]} strokeWidth="14" strokeLinecap="round" />
          {/* seat tube */}
          <line x1="295" y1="265" x2="265" y2="135" stroke={theme.frameAccent} strokeWidth="14" strokeLinecap="round" />
          {/* down tube */}
          <line x1="400" y1="120" x2="295" y2="265" stroke={theme.frame[0]} strokeWidth="14" strokeLinecap="round" />
          {/* top tube */}
          <line x1="265" y1="135" x2="400" y2="120" stroke={theme.frame[1]} strokeWidth="12" strokeLinecap="round" />
          {/* seat stay */}
          <line x1="130" y1="265" x2="265" y2="135" stroke={theme.frame[2]} strokeWidth="10" strokeLinecap="round" />
          {/* fork */}
          <line x1="400" y1="120" x2="460" y2="265" stroke={theme.frameAccent} strokeWidth="12" strokeLinecap="round" />

          {/* ── HANDLEBARS ── */}
          <Handlebars style={theme.handlebar} accent={theme.frameAccent} />

          {/* ── SEAT POST + SADDLE ── */}
          <line x1="270" y1="138" x2="270" y2="100" stroke={theme.frameAccent} strokeWidth="9" strokeLinecap="round" />
          {theme.handlebar === "city" ? (
            // Wider comfort saddle for city bike
            <path d="M 238 98 Q 270 86 305 96 Q 298 110 238 110 Z" fill={theme.saddle} />
          ) : theme.handlebar === "mountain" ? (
            // Mid-width saddle for MTB
            <path d="M 247 98 Q 270 87 295 96 Q 290 108 247 108 Z" fill={theme.saddle} />
          ) : (
            // Narrow racing saddle
            <path d="M 252 98 Q 270 89 292 96 Q 289 107 252 107 Z" fill={theme.saddle} />
          )}

          {/* ── CHAINRING ── */}
          <circle cx="295" cy="265" r="28" fill={theme.chainring} opacity="0.9" />
          <circle cx="295" cy="265" r="16" fill={theme.wheelDark} />
          <circle cx="295" cy="265" r="7"  fill="white" opacity="0.4" />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i * Math.PI * 2) / 10;
            return <circle key={i} cx={295 + 29 * Math.cos(a)} cy={265 + 29 * Math.sin(a)} r="3" fill={theme.chainring} />;
          })}

          {/* ── CHAIN ── */}
          <path d="M 130 255 L 295 255 A 10 10 0 0 1 295 278 L 130 278 A 14 14 0 0 1 130 255"
            fill="none" stroke={theme.chain} strokeWidth="5" strokeDasharray="6,3" />

          {/* ── CASSETTE ── */}
          <circle cx="130" cy="265" r="22" fill={theme.chainring} />
          <circle cx="130" cy="265" r="13" fill={theme.wheelDark} />
          <circle cx="130" cy="265" r="5"  fill="white" opacity="0.4" />

          {/* ── HOTSPOT DOTS + LABELS ── */}
          {(Object.entries(HOTSPOTS) as [BikeComponentComponentType, HotspotDef][]).map(([type, spot]) => (
            <g key={type} className="cursor-pointer" onClick={() => onSelectComponent(type)}>
              <circle cx={spot.cx} cy={spot.cy} r={spot.r} fill="transparent" />
              <motion.circle
                whileHover={{ scale: 1.5 }}
                whileTap={{ scale: 0.85 }}
                cx={spot.cx} cy={spot.cy} r={9}
                fill={dotFill(type)}
                stroke="white"
                strokeWidth={2.5}
                className={cn(shouldPulse(type) ? "animate-pulse" : "")}
              />
              <text
                x={spot.labelX} y={spot.labelY}
                textAnchor={spot.anchor}
                fontSize="9.5" fontWeight="700" fill="#475569"
                fontFamily="system-ui, sans-serif" letterSpacing="0.3"
                pointerEvents="none"
              >
                {spot.label}
              </text>
            </g>
          ))}
        </motion.svg>
      </AnimatePresence>

      {/* ── THEME CONTROLS ── */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-3">
        <button
          onClick={() => changeTheme(-1)}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors border border-gray-200"
          aria-label="Previous theme"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Colour swatches */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => {
                setThemeIdx(i);
                onThemeChange?.(i);
              }}
              title={t.name}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all",
                i === themeIdx ? "border-gray-800 scale-125" : "border-white hover:scale-110"
              )}
              style={{ backgroundColor: t.frame[0] }}
            />
          ))}
        </div>

        <button
          onClick={() => changeTheme(1)}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors border border-gray-200"
          aria-label="Next theme"
        >
          <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
};
