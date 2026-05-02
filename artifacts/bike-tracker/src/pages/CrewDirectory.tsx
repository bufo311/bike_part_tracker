import React, { useState, useEffect, useRef } from "react";
import { Users, MapPin, Plus, X, Loader2, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { getCrews, createCrew, type Crew } from "@/lib/data";

function CrewCard({ crew }: { crew: Crew }) {
  const [, setLocation] = useLocation();

  return (
    <button
      onClick={() => setLocation(`/crews/${crew.id}`)}
      className="w-full text-left bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden hover:border-red-200 hover:shadow-md active:scale-[0.99] transition-all"
    >
      {(() => {
        const cover = crew.bannerImages[0] ?? crew.bannerImageUrl;
        return cover ? (
          <div className="w-full aspect-video overflow-hidden bg-gray-100">
            <img src={cover} alt={crew.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-red-50 to-amber-100 flex items-center justify-center">
            <Users size={48} className="text-red-200" strokeWidth={1.5} />
          </div>
        );
      })()}
      <div className="p-4">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none truncate">
          {crew.name}
        </h3>
        {crew.location && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin size={12} className="text-gray-400 shrink-0" strokeWidth={2} />
            <span className="text-xs text-gray-500 font-medium">{crew.location}</span>
          </div>
        )}
      </div>
    </button>
  );
}

interface CreateCrewModalProps {
  onClose: () => void;
  onCreated: (crewId: string) => void;
}

function CreateCrewModal({ onClose, onCreated }: CreateCrewModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setBannerFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
    } else {
      setBannerPreview(null);
    }
  };

  useEffect(() => {
    return () => { if (bannerPreview) URL.revokeObjectURL(bannerPreview); };
  }, [bannerPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await createCrew(name.trim(), location.trim() || null, bannerFile);
    if (res.success && res.crewId) {
      onCreated(res.crewId);
    } else {
      setError(res.error ?? "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="create-crew-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom)]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Create a Crew</h2>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-gray-100 transition-colors text-gray-400" aria-label="Close">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Crew Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Night Owls"
              maxLength={60}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300 placeholder:font-normal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Location <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Portland, OR"
              maxLength={80}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300 placeholder:font-normal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Banner Image <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full rounded-2xl border-2 transition-colors overflow-hidden ${bannerPreview ? "border-red-300 bg-gray-100" : "border-dashed border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50"}`}
            >
              {bannerPreview ? (
                <div className="relative">
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Change Photo</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
                  <ImagePlus size={22} className="text-gray-300" strokeWidth={1.5} />
                  <span className="text-xs text-gray-400 font-medium">Tap to add a banner photo</span>
                </div>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" />Creating...</> : "Create Crew"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function CrewDirectory() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    getCrews().then(setCrews).finally(() => setLoading(false));
  }, []);

  const handleCreated = (crewId: string) => {
    setShowModal(false);
    setLocation(`/crews/${crewId}`);
  };

  return (
    <div className="min-h-[100dvh] bg-amber-50 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24">
      <header className="px-4 py-4 bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase leading-none">Crews</h1>
          <p className="text-gray-400 text-sm font-medium mt-0.5">public showcases</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm shadow-red-200 shrink-0"
        >
          <Plus size={15} strokeWidth={3} />
          Create
        </button>
      </header>

      <main className="px-4 sm:px-6 max-w-2xl mx-auto pt-6 space-y-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
          </div>
        )}

        {!loading && crews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Users size={48} className="text-gray-300" strokeWidth={1.5} />
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No crews yet</p>
              <p className="text-xs text-gray-400 mt-1">Be the first to create one!</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              <Plus size={14} strokeWidth={3} />
              Create a Crew
            </button>
          </div>
        )}

        {crews.map((crew, i) => (
          <motion.div
            key={crew.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <CrewCard crew={crew} />
          </motion.div>
        ))}
      </main>

      <AnimatePresence>
        {showModal && (
          <CreateCrewModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
        )}
      </AnimatePresence>
    </div>
  );
}
