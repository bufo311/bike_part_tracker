import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { Settings, AlertTriangle, CheckCircle2, PlusCircle, Pencil, ArrowLeft, ChevronLeft, ChevronRight, Wrench, Plus, Infinity, Trash2, SlidersHorizontal, Bike as BikeIcon, Map } from "lucide-react";
import { motion } from "framer-motion";
import { BikeVisualizer } from "@/components/BikeVisualizer";
import { ComponentSheet } from "@/components/ComponentSheet";
import { getBike, getComponents, updateBike, deleteComponent, insertActivity, getRideLogsByBike, type Bike, type Component, type RideLog } from "@/lib/data";
import { BikeChat } from "@/components/BikeChat";
import { useAuth } from "@/lib/auth";

type BikeComponentType =
  | "chain" | "cassette" | "chainring"
  | "front_tire" | "rear_tire"
  | "front_sealant" | "rear_sealant"
  | "front_brake_pads" | "rear_brake_pads"
  | "front_brake_rotors" | "rear_brake_rotors";

const COMPONENT_NAMES: Record<BikeComponentType, string> = {
  chain: "Chain", cassette: "Cassette", chainring: "Chainring",
  front_tire: "Front Tire", rear_tire: "Rear Tire",
  front_sealant: "Front Sealant", rear_sealant: "Rear Sealant",
  front_brake_pads: "Front Brake Pads", rear_brake_pads: "Rear Brake Pads",
  front_brake_rotors: "Front Rotors", rear_brake_rotors: "Rear Rotors",
};

const KNOWN_TYPES = new Set(Object.keys(COMPONENT_NAMES));

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const bikeId = parseInt(params.id);

  const [bike, setBike] = useState<Bike | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  const load = useCallback(async () => {
    if (isNaN(bikeId)) { setLocation("/"); return; }
    try {
      const bikeData = await getBike(bikeId);
      const compsData = await getComponents(bikeId, bikeData);
      setBike(bikeData);
      setNameInput(bikeData.name);
      setComponents(compsData);
    } catch {
      setLocation("/");
    } finally {
      setLoading(false);
    }
  }, [bikeId, setLocation]);

  useEffect(() => { load(); }, [load]);

  const commitName = async () => {
    const trimmed = nameInput.trim() || bike?.name || "My Bike";
    setEditingName(false);
    if (trimmed === bike?.name) return;
    try {
      const updated = await updateBike(bikeId, { name: trimmed });
      setBike(updated);
      setNameInput(updated.name);
    } catch { setNameInput(bike?.name ?? ""); }
  };

  const handleThemeChange = async (idx: number) => {
    try {
      const updated = await updateBike(bikeId, { themeIndex: idx });
      setBike(updated);
    } catch {}
  };

  const refreshComponents = async () => {
    if (!bike) return;
    try {
      const data = await getComponents(bikeId, bike);
      setComponents(data);
    } catch {}
  };

  const handleDeleteCustom = useCallback(async (comp: Component) => {
    if (!window.confirm(`Are you sure you want to delete "${comp.componentType}"?`)) return;
    try {
      await deleteComponent(comp.id);
      setComponents(prev => prev.filter(c => c.id !== comp.id));
      console.log("[ActivityFeed] insertActivity tripwire — removed their", comp.componentType, "| bike:", bike?.name ?? null);
      insertActivity(`removed their ${comp.componentType}`, bike?.name ?? null, bike?.id ?? null).catch(console.error);
    } catch (e) {
      console.error(e);
    }
  }, [bike]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }
  if (!bike) return null;

  const isOwner = bike.userId === session?.user.id;
  const needsAttention = components.filter(c => c.status === "replace" || c.status === "warning").length;
  const allGood = components.length > 0 && needsAttention === 0;
  const selectedComponent = components.find(c => c.componentType === selectedType) || null;

  return (
    <div className="min-h-[100dvh] bg-amber-50 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24">
      <header className="px-4 py-4 flex justify-between items-center bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setLocation("/")}
            className="p-2 bg-gray-100 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-200 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            {isOwner && editingName ? (
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-2xl font-bold text-gray-400 leading-none tracking-tight uppercase shrink-0">{bike.ownerUsername}'s</span>
                <input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameInput(bike.name); setEditingName(false); } }}
                  maxLength={32}
                  className="text-2xl font-bold text-gray-900 leading-none tracking-tight uppercase bg-transparent border-b-2 border-red-400 outline-none min-w-0 flex-1"
                  autoFocus
                />
              </div>
            ) : isOwner ? (
              <button
                onClick={() => { setNameInput(bike.name); setEditingName(true); }}
                className="group flex items-center gap-1.5 text-left max-w-full"
              >
                <h1 className="text-2xl font-bold text-gray-900 m-0 leading-none tracking-tight uppercase truncate">
                  {bike.ownerUsername}'s {bike.name}
                </h1>
                <Pencil size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 m-0 leading-none tracking-tight uppercase truncate">
                {bike.ownerUsername}'s {bike.name}
              </h1>
            )}
            <p className="text-gray-400 font-medium text-xs mt-0.5 uppercase">
              {bike.ridingStyle} · {bike.ridingFrequency.replace("_", " ")} · {bike.hoursPerWeek}h/wk
            </p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setLocation(`/bikes/${bikeId}/settings`)}
            className="p-3 bg-gray-100 border-2 border-gray-200 rounded-full hover:bg-gray-200 transition-colors text-gray-600 shrink-0"
          >
            <Settings size={20} />
          </button>
        )}
      </header>

      <main className="px-4 sm:px-6 max-w-2xl mx-auto space-y-5 pt-5">
        <motion.div
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`p-4 rounded-2xl flex items-center gap-4 border-2 shadow-sm ${
            allGood ? "bg-green-50 border-green-200 text-green-700"
            : needsAttention > 0 ? "bg-red-50 border-red-200 text-red-700"
            : "bg-white border-gray-200 text-gray-500"
          }`}
        >
          {allGood ? <CheckCircle2 size={26} />
            : needsAttention > 0 ? <AlertTriangle size={26} className="animate-pulse" />
            : <PlusCircle size={26} />}
          <div>
            <h3 className="text-base font-bold uppercase tracking-wide m-0 leading-tight">
              {allGood ? "Ready to ride!" : needsAttention > 0 ? "Attention Required" : "Start Tracking"}
            </h3>
            <p className="text-sm opacity-80 font-medium">
              {allGood ? "All components are in good shape."
                : needsAttention > 0 ? `${needsAttention} component(s) need your attention.`
                : "Tap a component on the bike below to log it."}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 }}>
          {bike.imageUrls.length > 0 ? (
            <PhotoGallery urls={bike.imageUrls} />
          ) : (
            <BikeVisualizer
              components={components as any}
              onSelectComponent={(t) => setSelectedType(t as BikeComponentType)}
              themeIndex={bike.themeIndex}
              onThemeChange={handleThemeChange}
            />
          )}
        </motion.div>

        <div className="space-y-4">
          <ComponentGroup label="Drivetrain" types={["chain", "cassette", "chainring"]} components={components} names={COMPONENT_NAMES} onSelect={setSelectedType} />
          <ComponentGroup label="Wheels & Sealant" types={["front_tire", "rear_tire", "front_sealant", "rear_sealant"]} components={components} names={COMPONENT_NAMES} onSelect={setSelectedType} />
          <ComponentGroup label="Brakes" types={["front_brake_pads", "rear_brake_pads", "front_brake_rotors", "rear_brake_rotors"]} components={components} names={COMPONENT_NAMES} onSelect={setSelectedType} />
          <CustomComponentsSection
            components={components}
            onSelect={setSelectedType}
            onAddCustom={() => setSelectedType("__custom__")}
            isOwner={isOwner}
            onDelete={handleDeleteCustom}
          />
        </div>

        <BuildSpecs bike={bike} isOwner={isOwner} onEdit={() => setLocation(`/bikes/${bikeId}/settings`)} />

        <RecentRides bikeId={bikeId} />

        <BikeChat bikeId={bikeId} bikeOwnerId={bike.userId} bikeName={bike.name} />
      </main>

      <ComponentSheet
        isOpen={selectedType !== null}
        onClose={() => setSelectedType(null)}
        type={selectedType}
        component={selectedComponent}
        bikeId={bikeId}
        bike={bike}
        onSaved={refreshComponents}
        isOwner={isOwner}
      />
    </div>
  );
}

function PhotoGallery({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + urls.length) % urls.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % urls.length); };
  return (
    <>
      <div className="relative rounded-3xl overflow-hidden bg-gray-900 border-2 border-gray-200 shadow-md aspect-square">
        <img
          key={idx}
          src={urls[idx]}
          alt={`Bike photo ${idx + 1}`}
          className="aspect-square object-cover w-full cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setZoomedImage(urls[idx])}
        />
        {urls.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {urls.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed bike photo"
            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

const SPEC_LABELS: { key: keyof Bike; label: string }[] = [
  { key: "specFrame",      label: "Frame" },
  { key: "specFork",       label: "Fork" },
  { key: "specRims",       label: "Rims" },
  { key: "specHandlebars", label: "Handlebars" },
  { key: "specSeat",       label: "Seat" },
  { key: "specGroupset",   label: "Groupset" },
  { key: "specPedals",     label: "Pedals" },
];

function RecentRides({ bikeId }: { bikeId: number }) {
  const [rides, setRides] = useState<RideLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomedRideImage, setZoomedRideImage] = useState<string | null>(null);

  useEffect(() => {
    getRideLogsByBike(bikeId)
      .then(setRides)
      .finally(() => setLoading(false));
  }, [bikeId]);

  if (loading || rides.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b-2 border-gray-100">
          <BikeIcon size={16} className="text-gray-500" strokeWidth={2.5} />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Recent Rides</h2>
          <span className="ml-auto text-xs font-bold text-gray-300">{rides.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {rides.map(ride => (
            <div key={ride.id} className="flex gap-3 p-3 items-start">
              {ride.imageUrl && (
                <img
                  src={ride.imageUrl}
                  alt="Ride"
                  className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => setZoomedRideImage(ride.imageUrl!)}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Map size={12} className="text-gray-400 shrink-0" strokeWidth={2} />
                  <span className="text-sm font-black text-red-500">{ride.mileage} mi</span>
                  <span className="text-[10px] text-gray-400 font-medium ml-auto">
                    {new Date(ride.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">@{ride.username}</p>
                {ride.notes && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{ride.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {zoomedRideImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedRideImage(null)}
        >
          <img
            src={zoomedRideImage}
            alt="Ride photo"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}

function BuildSpecs({ bike, isOwner, onEdit }: { bike: Bike; isOwner: boolean; onEdit: () => void }) {
  const filled = SPEC_LABELS.filter(({ key }) => {
    const v = bike[key];
    return typeof v === "string" && v.trim().length > 0;
  });
  const customEntries = Object.entries(bike.customSpecs ?? {}).filter(([k, v]) => k.trim() && v.trim());
  const hasSpecs = filled.length > 0 || customEntries.length > 0;

  if (!hasSpecs && !isOwner) return null;

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b-2 border-gray-100">
        <div className="flex items-center gap-2.5">
          <Wrench size={16} className="text-gray-500" strokeWidth={2.5} />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Bike Specifications</h2>
        </div>
        {isOwner && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <SlidersHorizontal size={13} strokeWidth={2.5} />
            Edit Specs
          </button>
        )}
      </div>

      {/* Specs list */}
      {hasSpecs ? (
        <div className="divide-y divide-gray-100">
          {filled.map(({ key, label }) => (
            <div key={key} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="w-28 shrink-0 text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
              <span className="text-sm font-semibold text-gray-800 leading-snug">{bike[key] as string}</span>
            </div>
          ))}
          {customEntries.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="w-28 shrink-0 text-xs font-bold text-gray-400 uppercase tracking-wide">{k}</span>
              <span className="text-sm font-semibold text-gray-800 leading-snug">{v}</span>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="w-full px-4 py-5 text-center text-sm text-gray-400 font-medium hover:bg-gray-50 transition-colors"
        >
          No specs added yet — tap <span className="font-bold text-red-500">Edit Specs</span> to add your build sheet.
        </button>
      )}
    </div>
  );
}

function componentColors(comp: Component | undefined) {
  if (!comp) return { bg: "bg-gray-100", border: "border-gray-200", badge: "bg-gray-200 text-gray-500" };
  if (comp.isLifetime) return { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" };
  if (comp.status === "good") return { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" };
  if (comp.status === "warning") return { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" };
  return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" };
}

function ComponentCard({ label, comp, onClick, onDelete }: {
  label: string;
  comp?: Component;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const colors = componentColors(comp);
  return (
    <div className={`relative rounded-2xl border-2 transition-all hover:shadow-md ${colors.bg} ${colors.border}`}>
      <button onClick={onClick} className="w-full p-3 text-left">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate">{label}</p>
        {comp ? (
          <>
            {comp.isLifetime ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Infinity size={18} className="text-violet-600" />
                <p className="text-lg font-bold text-violet-700">{comp.daysInstalled}d</p>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900 mt-0.5">{comp.daysInstalled}d</p>
            )}
            {comp.brandModel && (
              <p className="text-[10px] font-medium text-gray-500 leading-tight truncate mt-0.5">{comp.brandModel}</p>
            )}
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${colors.badge}`}>
              {comp.isLifetime ? "Lifetime" : comp.status === "replace" ? "Replace!" : comp.status}
            </span>
          </>
        ) : (
          <p className="text-sm font-medium text-gray-400 mt-1">Tap to log</p>
        )}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
          title="Delete component"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function ComponentGroup({ label, types, components, names, onSelect }: {
  label: string;
  types: BikeComponentType[];
  components: Component[];
  names: Record<BikeComponentType, string>;
  onSelect: (t: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {types.map(type => (
          <ComponentCard
            key={type}
            label={names[type]}
            comp={components.find(c => c.componentType === type)}
            onClick={() => onSelect(type)}
          />
        ))}
      </div>
    </div>
  );
}

function CustomComponentsSection({ components, onSelect, onAddCustom, isOwner, onDelete }: {
  components: Component[];
  onSelect: (t: string) => void;
  onAddCustom: () => void;
  isOwner: boolean;
  onDelete: (comp: Component) => void;
}) {
  const custom = components.filter(c => !KNOWN_TYPES.has(c.componentType));
  if (custom.length === 0 && !isOwner) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Components</p>
        {isOwner && (
          <button
            onClick={onAddCustom}
            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors"
          >
            <Plus size={13} /> Add Custom
          </button>
        )}
      </div>
      {custom.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {custom.map(comp => (
            <ComponentCard
              key={comp.componentType}
              label={comp.componentType}
              comp={comp}
              onClick={() => onSelect(comp.componentType)}
              onDelete={isOwner ? () => onDelete(comp) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 font-medium">
          Track anything not in the standard groups — brake cables, dropper post, saddle, etc.
        </p>
      )}
    </div>
  );
}
