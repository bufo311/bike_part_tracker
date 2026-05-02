import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, ChevronRight, LogOut, Zap, KeyRound, Copy, CheckCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBikes, createBike, deleteBike, getActivities, insertActivity, generateInviteCode, type Bike, type Activity } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { GlobalChat } from "@/components/GlobalChat";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-gray-100 flex items-center gap-2">
        <Zap size={13} className="text-amber-500" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Activity</h2>
      </div>
      <div ref={listRef} className="h-48 overflow-y-auto overscroll-contain">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-400 font-medium">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.map(a => {
              const clickable = !!a.bike_id;
              return clickable ? (
                <button
                  key={a.id}
                  onClick={() => setLocation(`/bikes/${a.bike_id}`)}
                  className="w-full px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <p className="text-sm text-gray-700 leading-snug">
                    <span className="font-bold text-gray-900">{a.username}</span>{" "}
                    {a.action}
                    {a.bike_name && (
                      <> — <span className="italic text-gray-500">{a.bike_name}</span></>
                    )}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">{relativeTime(a.created_at)}</p>
                </button>
              ) : (
                <div key={a.id} className="px-4 py-2.5">
                  <p className="text-sm text-gray-700 leading-snug">
                    <span className="font-bold text-gray-900">{a.username}</span>{" "}
                    {a.action}
                    {a.bike_name && (
                      <> — <span className="italic text-gray-500">{a.bike_name}</span></>
                    )}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">{relativeTime(a.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invite code generator ────────────────────────────────────────────────────
function InviteCodeWidget() {
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    setCode(null);
    const result = await generateInviteCode();
    setGenerating(false);
    if ("error" in result) {
      setGenError(result.error);
    } else {
      setCode(result.code);
    }
  };

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound size={13} className="text-gray-400 shrink-0" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generate Invite</h2>
      </div>

      {genError && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{genError}</p>
      )}

      {code ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
            <span className="font-mono font-black text-lg text-gray-900 tracking-widest">{code}</span>
          </div>
          <button
            onClick={copy}
            title="Copy code"
            className="p-2.5 rounded-2xl border-2 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            {copied ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
        </div>
      ) : null}

      <button
        onClick={generate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-700 text-white text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        {generating ? "Generating…" : code ? "Generate Another" : "Generate Invite Code"}
      </button>
    </div>
  );
}

// ── Mini bike SVG preview ───────────────────────────────────────────────────
const THEME_COLORS = [
  { frame: "#f87171", wheel: "#2563eb", saddle: "#f97316" },
  { frame: "#0ea5e9", wheel: "#1e3a5f", saddle: "#f59e0b" },
  { frame: "#16a34a", wheel: "#78350f", saddle: "#d97706" },
  { frame: "#ea580c", wheel: "#7c3aed", saddle: "#fbbf24" },
  { frame: "#ec4899", wheel: "#9333ea", saddle: "#fde047" },
  { frame: "#4338ca", wheel: "#111827", saddle: "#fbbf24" },
  { frame: "#ca8a04", wheel: "#166534", saddle: "#f97316" },
  { frame: "#bae6fd", wheel: "#0369a1", saddle: "#f9a8d4" },
  { frame: "#a855f7", wheel: "#831843", saddle: "#fde047" },
  { frame: "#d97706", wheel: "#7c2d12", saddle: "#92400e" },
];

function MiniBike({ themeIndex, size = 80 }: { themeIndex: number; size?: number }) {
  const t = THEME_COLORS[themeIndex % THEME_COLORS.length];
  return (
    <svg viewBox="0 0 120 80" width={size} height={size * 0.67} aria-hidden>
      <circle cx="26" cy="54" r="20" fill="none" stroke={t.wheel} strokeWidth="4" />
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = i * Math.PI / 4;
        return <line key={i} x1="26" y1="54" x2={26+19*Math.cos(a)} y2={54+19*Math.sin(a)} stroke={t.wheel} strokeWidth="1.2" opacity="0.6" />;
      })}
      <circle cx="26" cy="54" r="4" fill={t.wheel} />
      <circle cx="94" cy="54" r="20" fill="none" stroke={t.wheel} strokeWidth="4" />
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = i * Math.PI / 4;
        return <line key={i} x1="94" y1="54" x2={94+19*Math.cos(a)} y2={54+19*Math.sin(a)} stroke={t.wheel} strokeWidth="1.2" opacity="0.6" />;
      })}
      <circle cx="94" cy="54" r="4" fill={t.wheel} />
      <line x1="26" y1="54" x2="60" y2="54" stroke={t.frame} strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="54" x2="54" y2="26" stroke={t.frame} strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="22" x2="60" y2="54" stroke={t.frame} strokeWidth="4" strokeLinecap="round" />
      <line x1="54" y1="26" x2="80" y2="22" stroke={t.frame} strokeWidth="3" strokeLinecap="round" />
      <line x1="26" y1="54" x2="54" y2="26" stroke={t.frame} strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="22" x2="94" y2="54" stroke={t.frame} strokeWidth="3" strokeLinecap="round" />
      <line x1="54" y1="26" x2="54" y2="14" stroke={t.frame} strokeWidth="3" strokeLinecap="round" />
      <path d="M46 13 Q54 9 62 13 Q60 18 46 18 Z" fill={t.saddle} />
      <path d="M80 20 C88 15 93 16 95 20" fill="none" stroke={t.frame} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="54" r="7" fill={t.wheel} opacity="0.85" />
      <circle cx="60" cy="54" r="3.5" fill="white" opacity="0.3" />
    </svg>
  );
}

export default function Garage() {
  const [, setLocation] = useLocation();
  const { signOut, session } = useAuth();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingBike, setSavingBike] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getBikes()
      .then(data => { setBikes(data); setLoading(false); })
      .catch(() => { setLoading(false); setError("Could not load bikes. Check your connection."); });
  }, []);

  useEffect(() => {
    getActivities().then(setActivities).catch(console.error);
    const channel = supabase
      .channel("activities-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, payload => {
        const row = payload.new as Record<string, unknown>;
        setActivities(prev => [{
          id: row.id as number,
          user_id: row.user_id as string,
          username: row.username as string,
          action: row.action as string,
          bike_name: row.bike_name as string | null,
          bike_id: (row.bike_id as number | null) ?? null,
          created_at: row.created_at as string,
        }, ...prev].slice(0, 30));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addBike = async () => {
    const name = newName.trim() || "New Bike";
    setSavingBike(true);
    setError(null);
    try {
      const bike = await createBike(name);
      setBikes(prev => [...prev, bike]);
      setNewName("");
      setAdding(false);
      insertActivity("added a new bike", name, bike.id).catch(console.error);
      setLocation(`/bikes/${bike.id}`);
    } catch (e) {
      setError("Could not add bike. Please try again.");
      console.error(e);
    } finally {
      setSavingBike(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteBike(id);
      setBikes(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-amber-50 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24">
      <header className="px-6 py-5 bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase leading-none">Garage</h1>
          <p className="text-gray-400 text-sm font-medium mt-0.5">the bike collection</p>
        </div>
        <button
          onClick={signOut}
          className="p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="px-4 sm:px-6 max-w-5xl mx-auto pt-6">
        <div className="flex flex-col md:flex-row md:gap-6 md:items-start">

          {/* Global chat + activity feed — above bikes on mobile, sticky left sidebar on desktop */}
          <div className="w-full md:w-80 lg:w-96 mb-6 md:mb-0 md:sticky md:top-20 space-y-4">
            <ActivityFeed activities={activities} />
            <GlobalChat />
            <InviteCodeWidget />
          </div>

          {/* Bike list column */}
          <div className="flex-1 space-y-4">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <AnimatePresence initial={false}>
              {[...bikes].sort((a, b) => {
                const myId = session?.user.id;
                const aIsMine = a.userId === myId ? 0 : 1;
                const bIsMine = b.userId === myId ? 0 : 1;
                if (aIsMine !== bIsMine) return aIsMine - bIsMine;
                const aTime = a.updatedAt || a.createdAt;
                const bTime = b.updatedAt || b.createdAt;
                return bTime.localeCompare(aTime);
              }).map((bike, i) => (
                <motion.div
                  key={bike.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden flex items-center gap-4 pr-3">
                    <button
                      onClick={() => setLocation(`/bikes/${bike.id}`)}
                      className="flex-1 flex items-center gap-4 p-4 text-left hover:bg-amber-50 transition-colors"
                    >
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-2 shrink-0">
                        <MiniBike themeIndex={bike.themeIndex} size={72} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-gray-900 truncate uppercase tracking-tight">
                          {bike.ownerUsername}'s {bike.name}
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase">
                          {bike.ridingStyle} · {bike.ridingFrequency.replace("_", " ")}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 shrink-0" />
                    </button>
                    {bikes.length > 1 && bike.userId === session?.user.id && (
                      <button
                        onClick={() => handleDelete(bike.id)}
                        disabled={deletingId === bike.id}
                        className="p-2 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                        aria-label="Delete bike"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {adding ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="bg-white rounded-3xl border-2 border-red-200 shadow-sm p-5 space-y-3"
                >
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Bike</p>
                  <input
                    autoFocus
                    type="text"
                    maxLength={32}
                    placeholder="e.g. Trail Ripper, Sunday Gravel..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addBike(); if (e.key === "Escape") setAdding(false); }}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 font-bold text-gray-900 text-lg focus:outline-none focus:border-red-400 transition-colors uppercase tracking-tight"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAdding(false); setError(null); }}
                      className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold uppercase text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addBike}
                      disabled={savingBike}
                      className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white font-bold uppercase text-sm shadow hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {savingBike ? "Adding..." : "Add Bike"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="add-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setAdding(true)}
                  className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-300 text-gray-400 font-bold uppercase tracking-widest text-sm hover:border-red-300 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add a Bike
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
