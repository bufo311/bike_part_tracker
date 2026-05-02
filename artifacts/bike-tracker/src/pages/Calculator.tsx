import React, { useState } from "react";
import { Calculator as CalcIcon, Copy, CheckCheck, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRESETS: { label: string; miles: number }[] = [
  { label: "Chain", miles: 2000 },
  { label: "Cassette", miles: 6000 },
  { label: "Chainring", miles: 15000 },
  { label: "Front Tire", miles: 5000 },
  { label: "Rear Tire", miles: 3500 },
  { label: "Front Brake Pads", miles: 3000 },
  { label: "Rear Brake Pads", miles: 2500 },
];

export default function Calculator() {
  const [milesPerWeek, setMilesPerWeek] = useState<string>("50");
  const [mileLifespan, setMileLifespan] = useState<string>("2000");
  const [copied, setCopied] = useState(false);

  const mpw = parseFloat(milesPerWeek) || 0;
  const ml = parseFloat(mileLifespan) || 0;

  const days = mpw > 0 && ml > 0 ? Math.round((ml / mpw) * 7) : null;
  const weeks = days ? Math.round(days / 7) : null;
  const months = days ? (days / 30.44).toFixed(1) : null;

  const handleCopy = () => {
    if (days) {
      navigator.clipboard.writeText(String(days));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const applyPreset = (miles: number) => {
    setMileLifespan(String(miles));
  };

  return (
    <div className="min-h-[100dvh] bg-amber-50 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24">
      {/* Header */}
      <header className="px-6 py-6 flex items-center gap-3 bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
          <CalcIcon size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 leading-none tracking-tight uppercase">
            Lifespan Calculator
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">Convert miles to days for component tracking</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 max-w-lg mx-auto pt-6 space-y-6">

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-700">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium leading-snug">
            Enter how many miles you ride per week and the mile lifespan of the component. The calculator will tell you how many days that component should last, which you can enter on the main screen.
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm p-6 space-y-5">

          {/* Miles per week */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Miles Per Week
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="1"
                value={milesPerWeek}
                onChange={(e) => setMilesPerWeek(e.target.value)}
                className="w-full px-4 py-3.5 pr-16 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                mi/wk
              </span>
            </div>
            {/* Quick picks */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[25, 50, 100, 150, 200].map((v) => (
                <button
                  key={v}
                  onClick={() => setMilesPerWeek(String(v))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-colors ${
                    milesPerWeek === String(v)
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Mile lifespan */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Component Mile Lifespan
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="100"
                value={mileLifespan}
                onChange={(e) => setMileLifespan(e.target.value)}
                className="w-full px-4 py-3.5 pr-16 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 text-lg font-bold focus:outline-none focus:border-red-500 transition-colors"
                placeholder="2000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                miles
              </span>
            </div>
          </div>
        </div>

        {/* Component presets */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Common Lifespans (tap to use)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.miles)}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  mileLifespan === String(p.miles)
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{p.label}</p>
                <p className="text-base font-bold text-gray-900">{p.miles.toLocaleString()} mi</p>
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {days !== null ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", damping: 20, stiffness: 220 }}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Big result */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center text-white">
                <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">
                  Lifespan in Days
                </p>
                <p className="text-7xl font-black leading-none">{days}</p>
                <p className="text-lg opacity-80 mt-2 font-semibold">days</p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 divide-x-2 divide-gray-100 border-b-2 border-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Weeks</p>
                  <p className="text-2xl font-bold text-gray-900">{weeks}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Months</p>
                  <p className="text-2xl font-bold text-gray-900">{months}</p>
                </div>
              </div>

              {/* Copy button */}
              <div className="p-4">
                <button
                  onClick={handleCopy}
                  className={`w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCheck size={18} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} /> Copy {days} days
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-2 font-medium">
                  Copy this number, then paste it into the Lifespan field when logging a component on the main screen.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-400 font-medium"
            >
              Enter values above to calculate
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
