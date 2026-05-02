import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Bike, Activity, Clock, Mountain, ArrowLeft, Camera, X, Wrench, Plus, Trash2 } from "lucide-react";
import { getBike, updateBike, uploadBikeImage, deleteBikeImageFromStorage, insertActivity, cropToSquare, type Bike as BikeType } from "@/lib/data";

const SPEC_FIELDS: { key: keyof BikeSpecs; label: string; placeholder: string }[] = [
  { key: "specFrame",      label: "Frame",      placeholder: "e.g. Santa Cruz Hightower" },
  { key: "specFork",       label: "Fork",        placeholder: "e.g. Fox 36 Factory 150mm" },
  { key: "specRims",       label: "Rims",        placeholder: "e.g. DT Swiss EX511 29\"" },
  { key: "specHandlebars", label: "Handlebars",  placeholder: "e.g. Race Face Aeffect 800mm" },
  { key: "specSeat",       label: "Seat",        placeholder: "e.g. WTB Volt 142mm" },
  { key: "specGroupset",   label: "Groupset",    placeholder: "e.g. SRAM GX Eagle 12-speed" },
  { key: "specPedals",     label: "Pedals",      placeholder: "e.g. Crankbrothers Stamp 7" },
];

interface BikeSpecs {
  specFrame: string; specFork: string; specRims: string;
  specHandlebars: string; specSeat: string; specGroupset: string; specPedals: string;
}

const EMPTY_SPECS: BikeSpecs = {
  specFrame: "", specFork: "", specRims: "", specHandlebars: "", specSeat: "", specGroupset: "", specPedals: "",
};

const MAX_PHOTOS = 2;

const profileSchema = z.object({
  ridingFrequency: z.enum(["daily", "several_weekly", "weekly", "occasional"]),
  ridingStyle: z.enum(["road", "mtb", "gravel", "mixed"]),
  hoursPerWeek: z.coerce.number().min(1).max(100),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const bikeId = parseInt(params.id);

  const [bike, setBike] = useState<BikeType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [specs, setSpecs] = useState<BikeSpecs>(EMPTY_SPECS);
  const [customRows, setCustomRows] = useState<{ key: string; value: string }[]>([]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ridingFrequency: "weekly", ridingStyle: "road", hoursPerWeek: 5 },
  });

  useEffect(() => {
    if (isNaN(bikeId)) { setLocation("/"); return; }
    getBike(bikeId)
      .then(b => {
        setBike(b);
        reset({ ridingFrequency: b.ridingFrequency as any, ridingStyle: b.ridingStyle as any, hoursPerWeek: b.hoursPerWeek });
        setSpecs({
          specFrame: b.specFrame ?? "",
          specFork: b.specFork ?? "",
          specRims: b.specRims ?? "",
          specHandlebars: b.specHandlebars ?? "",
          specSeat: b.specSeat ?? "",
          specGroupset: b.specGroupset ?? "",
          specPedals: b.specPedals ?? "",
        });
        setCustomRows(Object.entries(b.customSpecs ?? {}).map(([key, value]) => ({ key, value })));
      })
      .catch(() => setLocation("/"));
  }, [bikeId, reset, setLocation]);

  const handlePhotoUpload = async (file: File) => {
    if (!bike) return;
    if (bike.imageUrls.length >= MAX_PHOTOS) {
      setPhotoError(`Max ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    setPhotoError("");
    setUploading(true);
    try {
      const cropped = await cropToSquare(file);
      const url = await uploadBikeImage(bikeId, cropped);
      const newUrls = [...bike.imageUrls, url];
      const updated = await updateBike(bikeId, { imageUrls: newUrls });
      setBike(updated);
    } catch (e: any) {
      setPhotoError(e.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async (url: string) => {
    if (!bike) return;
    setPhotoError("");
    try {
      await deleteBikeImageFromStorage(url);
      const newUrls = bike.imageUrls.filter(u => u !== url);
      const updated = await updateBike(bikeId, { imageUrls: newUrls });
      setBike(updated);
    } catch (e: any) {
      setPhotoError(e.message ?? "Delete failed.");
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    const customSpecs: Record<string, string> = {};
    for (const row of customRows) {
      const k = row.key.trim();
      const v = row.value.trim();
      if (k && v) customSpecs[k] = v;
    }
    await updateBike(bikeId, {
      ridingFrequency: data.ridingFrequency,
      ridingStyle: data.ridingStyle,
      hoursPerWeek: data.hoursPerWeek,
      specFrame: specs.specFrame,
      specFork: specs.specFork,
      specRims: specs.specRims,
      specHandlebars: specs.specHandlebars,
      specSeat: specs.specSeat,
      specGroupset: specs.specGroupset,
      specPedals: specs.specPedals,
      customSpecs,
    });
    insertActivity("updated their bike specs", bike?.name ?? null, bike?.id ?? null).catch(console.error);
    setLocation(`/bikes/${bikeId}`);
  };

  const selectedFreq = watch("ridingFrequency");
  const selectedStyle = watch("ridingStyle");
  const hours = watch("hoursPerWeek");

  return (
    <div className="min-h-[100dvh] pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24 px-4 sm:px-6 flex flex-col items-center bg-amber-50">
      <div className="w-full max-w-md">
        <button
          onClick={() => setLocation(`/bikes/${bikeId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-sm uppercase tracking-wider mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-red-100 text-red-600 mb-4">
            <Bike size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">Bike Settings</h1>
          <p className="text-gray-500 text-base">Photos, riding profile, and more.</p>
        </div>

        {/* ── Photos section ─────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-3xl border-2 border-gray-200 shadow-lg space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
            <Camera size={18} /> Bike Photos <span className="text-gray-300 font-normal normal-case">(max {MAX_PHOTOS})</span>
          </label>

          <div className="flex gap-3 flex-wrap">
            {(bike?.imageUrls ?? []).map((url, i) => (
              <div key={url} className="relative w-24 h-24">
                <img
                  src={url}
                  alt={`Bike photo ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-2xl border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handlePhotoDelete(url)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {(bike?.imageUrls ?? []).length < MAX_PHOTOS && (
              <label className={`w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 transition-colors ${uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100 hover:border-gray-400"}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera size={22} className="text-gray-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Add Photo</span>
                  </>
                )}
              </label>
            )}
          </div>

          {photoError && (
            <p className="text-sm text-red-500 font-medium">{photoError}</p>
          )}
          <p className="text-xs text-gray-400">
            Photos replace the cartoon bike on the details page. The cartoon still shows on your Garage.
          </p>
        </div>

        {/* ── Bike Specs section ─────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-3xl border-2 border-gray-200 shadow-lg space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
            <Wrench size={18} /> Bike Specs
          </label>
          <p className="text-xs text-gray-400">These show up as a Build Sheet on the bike page. Leave blank to hide.</p>
          <div className="space-y-3">
            {SPEC_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                <input
                  type="text"
                  maxLength={100}
                  placeholder={placeholder}
                  value={specs[key]}
                  onChange={e => setSpecs(prev => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300"
                />
              </div>
            ))}

            {customRows.length > 0 && (
              <div className="pt-1 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Items</p>
                {customRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={48}
                      placeholder="Item (e.g. Rack)"
                      value={row.key}
                      onChange={e => setCustomRows(prev => prev.map((r, j) => j === i ? { ...r, key: e.target.value } : r))}
                      className="w-28 shrink-0 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300"
                    />
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Description (e.g. Surly 8-Pack)"
                      value={row.value}
                      onChange={e => setCustomRows(prev => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                      className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomRows(prev => prev.filter((_, j) => j !== i))}
                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCustomRows(prev => [...prev, { key: "", value: "" }])}
              className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors pt-1"
            >
              <Plus size={15} /> Add Custom Spec
            </button>
          </div>
        </div>

        {/* ── Rider profile form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border-2 border-gray-200 shadow-lg">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
              <Activity size={18} /> How often do you ride?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: "daily", label: "Daily" }, { id: "several_weekly", label: "Multi/Week" }, { id: "weekly", label: "Weekly" }, { id: "occasional", label: "Occasional" }].map(opt => (
                <button key={opt.id} type="button" onClick={() => setValue("ridingFrequency", opt.id as any)}
                  className={`p-3 rounded-xl border-2 transition-all font-semibold ${selectedFreq === opt.id ? "border-red-500 bg-red-50 text-red-600" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.ridingFrequency && <p className="text-red-500 text-sm">{errors.ridingFrequency.message}</p>}
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
              <Mountain size={18} /> Primary Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: "road", label: "Road" }, { id: "mtb", label: "MTB" }, { id: "gravel", label: "Gravel" }, { id: "mixed", label: "Mixed" }].map(opt => (
                <button key={opt.id} type="button" onClick={() => setValue("ridingStyle", opt.id as any)}
                  className={`p-3 rounded-xl border-2 transition-all font-semibold ${selectedStyle === opt.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.ridingStyle && <p className="text-red-500 text-sm">{errors.ridingStyle.message}</p>}
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between text-sm font-bold text-gray-500 uppercase tracking-wider">
              <span className="flex items-center gap-2"><Clock size={18} /> Hours per week</span>
              <span className="text-2xl text-gray-900 font-bold">{hours} hrs</span>
            </label>
            <input type="range" min="1" max="30" {...register("hoursPerWeek")}
              className="w-full accent-red-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            {errors.hoursPerWeek && <p className="text-red-500 text-sm">{errors.hoursPerWeek.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-lg font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow-md">
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
