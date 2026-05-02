import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Wrench, Calendar, Clock, ArrowRight, Timer, Pencil, Infinity } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveComponent, insertActivity, type Bike, type Component } from "@/lib/data";

// Parse a YYYY-MM-DD string into a local Date for display with date-fns.
// Using new Date(str) would interpret as UTC midnight and shift the displayed day in non-UTC zones.
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type BikeComponentType =
  | "chain" | "cassette" | "chainring"
  | "front_sealant" | "rear_sealant"
  | "front_brake_rotors" | "rear_brake_rotors"
  | "front_brake_pads" | "rear_brake_pads"
  | "front_tire" | "rear_tire";

interface ComponentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
  component: Component | null;
  bikeId: number;
  bike: Bike;
  onSaved: () => void;
  isOwner: boolean;
}

const COMPONENT_NAMES: Record<BikeComponentType, string> = {
  chain: "Drive Chain", cassette: "Rear Cassette", chainring: "Front Chainring",
  front_sealant: "Front Sealant", rear_sealant: "Rear Sealant",
  front_brake_rotors: "Front Brake Rotors", rear_brake_rotors: "Rear Brake Rotors",
  front_brake_pads: "Front Brake Pads", rear_brake_pads: "Rear Brake Pads",
  front_tire: "Front Tire", rear_tire: "Rear Tire",
};

const DEFAULT_LIFESPAN: Record<BikeComponentType, number> = {
  chain: 90, cassette: 180, chainring: 365,
  front_sealant: 90, rear_sealant: 90,
  front_brake_rotors: 365, rear_brake_rotors: 365,
  front_brake_pads: 120, rear_brake_pads: 120,
  front_tire: 180, rear_tire: 150,
};

export const ComponentSheet: React.FC<ComponentSheetProps> = ({
  isOpen, onClose, type, component, bikeId, bike, onSaved, isOwner,
}) => {
  const [formMode, setFormMode] = useState<null | "replace" | "edit">(null);
  const [installDate, setInstallDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lifespanDays, setLifespanDays] = useState<number | string>("");
  const [brandModel, setBrandModel] = useState("");
  const [isLifetime, setIsLifetime] = useState(false);
  const [customTypeName, setCustomTypeName] = useState("");
  const [saving, setSaving] = useState(false);

  const isCustomNew = type === "__custom__";
  const isKnownType = type !== null && type !== "__custom__" && type in COMPONENT_NAMES;
  const displayName = isCustomNew
    ? (customTypeName.trim() || "Custom Component")
    : (COMPONENT_NAMES[type as BikeComponentType] ?? type ?? "Component");

  React.useEffect(() => {
    // Auto-open the form immediately for new custom components
    setFormMode(type === "__custom__" ? "replace" : null);
    setInstallDate(format(new Date(), "yyyy-MM-dd"));
    setLifespanDays("");
    setBrandModel("");
    setIsLifetime(false);
    setCustomTypeName("");
  }, [type]);

  const openReplace = () => {
    setInstallDate(format(new Date(), "yyyy-MM-dd"));
    setLifespanDays(component?.lifespanDays ?? "");
    setBrandModel(component?.brandModel ?? "");
    setIsLifetime(component?.isLifetime ?? false);
    setFormMode("replace");
  };

  const openEdit = () => {
    // component.installedAt is already a YYYY-MM-DD string — use it directly
    setInstallDate(component ? component.installedAt : format(new Date(), "yyyy-MM-dd"));
    setLifespanDays(component?.lifespanDays ?? "");
    setBrandModel(component?.brandModel ?? "");
    setIsLifetime(component?.isLifetime ?? false);
    setFormMode("edit");
  };

  const openNew = () => {
    setInstallDate(format(new Date(), "yyyy-MM-dd"));
    setLifespanDays("");
    setBrandModel("");
    setIsLifetime(false);
    setFormMode("replace");
  };

  if (!type) return null;

  const handleSave = async () => {
    const effectiveType = isCustomNew ? customTypeName.trim() : type;
    if (!effectiveType) return;
    setSaving(true);
    const lifespanVal = (!isLifetime && lifespanDays !== "") ? Number(lifespanDays) : null;
    try {
      await saveComponent({
        componentId: component?.id,
        bikeId,
        componentType: effectiveType,
        installedAt: installDate, // YYYY-MM-DD string — Supabase stores as UTC midnight
        lifespanDays: lifespanVal,
        brandModel: brandModel.trim() || null,
        notes: component?.notes ?? null,
        isLifetime,
        bike,
      });
      const compLabel = isCustomNew ? customTypeName.trim() : displayName;
      const action = !component?.id
        ? `added a new ${compLabel}`
        : formMode === "replace"
        ? `replaced their ${compLabel}`
        : `updated their ${compLabel}`;
      console.log("[ActivityFeed] insertActivity tripwire —", action, "| bike:", bike.name);
      insertActivity(action, bike.name, bike.id).catch(console.error);
      onSaved();
      setFormMode(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const percentUsed = component ? Math.min(component.percentUsed, 100) : 0;
  const defaultLifespan = DEFAULT_LIFESPAN[type as BikeComponentType] ?? 365;

  const isLifetimeComp = component?.isLifetime ?? false;

  const statusColors = {
    bar: !component ? "bg-gray-300"
      : isLifetimeComp ? "bg-violet-400"
      : component.status === "good" ? "bg-green-500"
      : component.status === "warning" ? "bg-amber-400"
      : "bg-red-500",
    badge: !component ? "bg-gray-100 text-gray-500"
      : isLifetimeComp ? "bg-violet-100 text-violet-700"
      : component.status === "good" ? "bg-green-100 text-green-700"
      : component.status === "warning" ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700",
    icon: !component ? "bg-gray-100 text-gray-500"
      : isLifetimeComp ? "bg-violet-100 text-violet-600"
      : component.status === "good" ? "bg-green-100 text-green-600"
      : component.status === "warning" ? "bg-amber-100 text-amber-600"
      : "bg-red-100 text-red-600",
  };

  const statusLabel = !component ? "Not Tracked"
    : isLifetimeComp ? "Lifetime"
    : component.status === "replace" ? "Replace Now"
    : component.status;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white border-t-2 border-gray-200 p-6 shadow-2xl md:max-w-lg md:mx-auto"
          >
            <div className="absolute top-3 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-300" />
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mt-4">
              <div className="flex items-center gap-3 mb-5">
                <div className={cn("p-3 rounded-2xl", statusColors.icon)}>
                  <Wrench size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 m-0 leading-none">{displayName}</h2>
                  {component?.brandModel && (
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{component.brandModel}</p>
                  )}
                  <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider", statusColors.badge)}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {formMode === null ? (
                <div className="space-y-4">
                  {component ? (
                    <>
                      {isLifetimeComp ? (
                        <div className="space-y-3">
                          <div className="flex flex-col items-center gap-2 py-3 bg-violet-50 rounded-2xl border-2 border-violet-200">
                            <Infinity size={28} className="text-violet-400" />
                            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">Tracking Indefinitely</p>
                            <p className="text-2xl font-bold text-violet-700">{component.daysInstalled} days</p>
                            <p className="text-sm font-medium text-violet-500">
                              Installed on {format(parseDateStr(component.installedAt), "MMMM d, yyyy")}
                            </p>
                          </div>
                          {component.brandModel && (
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-center">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Brand &amp; Model</p>
                              <p className="text-sm font-semibold text-gray-800">{component.brandModel}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-gray-500">Lifespan Used</span>
                              <span className={cn("font-bold", component.status === "replace" ? "text-red-500" : "text-gray-800")}>
                                {Math.round(component.percentUsed)}%
                              </span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentUsed}%` }}
                                transition={{ duration: 0.9, ease: "easeOut" }}
                                className={cn("h-full rounded-full", statusColors.bar)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                <Clock size={12} />
                                <span className="text-xs font-bold uppercase tracking-wider">Days On</span>
                              </div>
                              <p className="text-xl font-bold text-gray-900">{component.daysInstalled}</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                <Timer size={12} />
                                <span className="text-xs font-bold uppercase tracking-wider">Lifespan</span>
                              </div>
                              <p className="text-xl font-bold text-blue-600">{component.estimatedReplacementDays}d</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                                <Calendar size={12} />
                                <span className="text-xs font-bold uppercase tracking-wider">Installed</span>
                              </div>
                              <p className="text-sm font-bold text-gray-800">{format(parseDateStr(component.installedAt), "MMM d, yy")}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {isOwner ? (
                        <div className="flex gap-2">
                          <button
                            className="flex-1 py-3 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                            onClick={openEdit}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                          <button
                            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow"
                            onClick={openReplace}
                          >
                            Replace <ArrowRight size={15} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">View only</p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-5 text-base">This component isn't being tracked yet.</p>
                      {isOwner ? (
                        <button
                          className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-widest transition-colors shadow"
                          onClick={isCustomNew ? openNew : openReplace}
                        >
                          Start Tracking
                        </button>
                      ) : (
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">View only</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  {formMode === "edit" && (
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest text-center">Editing current record</p>
                  )}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    {isCustomNew && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                          Component Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Brake Cables, Dropper Post, Saddle"
                          value={customTypeName}
                          onChange={e => setCustomTypeName(e.target.value)}
                          maxLength={48}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Installation Date</label>
                      <input
                        type="date"
                        value={installDate}
                        onChange={e => setInstallDate(e.target.value)}
                        max={format(new Date(), "yyyy-MM-dd")}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isLifetime}
                          onChange={e => setIsLifetime(e.target.checked)}
                          className="w-4 h-4 rounded accent-violet-500 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Infinity size={15} className="text-violet-500" />
                          Track indefinitely (no replacement target)
                        </span>
                      </label>
                    </div>

                    {!isLifetime && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                          Lifespan (days) <span className="text-gray-400 font-normal normal-case">— leave blank to auto-calculate</span>
                        </label>
                        <input
                          type="number" min="1" max="3650"
                          placeholder={isKnownType ? `e.g. ${defaultLifespan} days (default)` : "e.g. 365 days"}
                          value={lifespanDays}
                          onChange={e => setLifespanDays(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                        />
                        {isKnownType && (
                          <p className="text-xs text-gray-400 mt-1">Use the Calculator tab to convert miles → days.</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        Brand &amp; Model <span className="text-gray-400 font-normal normal-case">— optional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shimano CN-M8100, Maxxis Minion DHF"
                        value={brandModel}
                        onChange={e => setBrandModel(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 bg-white text-gray-600 font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                      onClick={() => setFormMode(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className={cn(
                        "flex-1 py-3 rounded-2xl text-white font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow",
                        formMode === "edit" ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
                      )}
                      onClick={handleSave}
                      disabled={saving || (isCustomNew && !customTypeName.trim())}
                    >
                      {saving ? "Saving..." : formMode === "edit" ? "Update" : "Save"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
