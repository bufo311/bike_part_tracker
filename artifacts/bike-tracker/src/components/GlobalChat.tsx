import React, { useState, useEffect, useRef } from "react";
import { Send, Globe, Bike, Map, X, Camera, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  getRideLogsGlobal, insertRideLog, uploadRideImage, cropToSquare, getUserBikes,
  type RideLog,
} from "@/lib/data";

interface Message {
  id: number;
  message_text: string;
  created_at: string;
  profile_id: string;
  profiles: { username: string } | null;
}

type FeedItem =
  | { kind: "message"; data: Message }
  | { kind: "ride"; data: RideLog };

function itemSortKey(item: FeedItem) {
  return item.kind === "message" ? item.data.created_at : item.data.createdAt;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function RideCard({ ride, isMe, onImageClick }: { ride: RideLog; isMe: boolean; onImageClick?: (url: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col mb-3 ${isMe ? "items-end" : "items-start"}`}
    >
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 px-1">
        {isMe ? "You" : `@${ride.username}`} · Logged a Ride
      </span>
      <div className={`w-52 rounded-2xl overflow-hidden border-2 shadow-sm ${isMe ? "border-red-200 rounded-br-sm" : "border-gray-200 rounded-bl-sm"} bg-white`}>
        {ride.imageUrl && (
          <img
            src={ride.imageUrl}
            alt="Ride"
            className="w-full aspect-square object-cover cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => onImageClick?.(ride.imageUrl!)}
          />
        )}
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Bike size={12} className="text-red-500 shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-bold text-gray-700 truncate">{ride.bikeName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Map size={12} className="text-gray-400 shrink-0" strokeWidth={2} />
            <span className="text-xs font-black text-red-500">{ride.mileage} mi</span>
          </div>
          {ride.notes && (
            <p className="text-xs text-gray-600 leading-relaxed">{ride.notes}</p>
          )}
        </div>
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(ride.createdAt)}</span>
    </motion.div>
  );
}

export function GlobalChat() {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoomedRideImage, setZoomedRideImage] = useState<string | null>(null);

  const [showLogRide, setShowLogRide] = useState(false);
  const [userBikes, setUserBikes] = useState<{ id: number; name: string }[]>([]);
  const [logBikeId, setLogBikeId] = useState<number | "">("");
  const [logMileage, setLogMileage] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logImageFile, setLogImageFile] = useState<File | null>(null);
  const [logImagePreview, setLogImagePreview] = useState<string | null>(null);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState("");

  const fetchFeed = async () => {
    try {
      const [msgResult, rideLogs] = await Promise.all([
        supabase
          .from("global_messages")
          .select("id, message_text, created_at, profile_id, profiles(username)")
          .order("created_at", { ascending: true })
          .limit(100),
        getRideLogsGlobal(),
      ]);
      const msgs = Array.isArray(msgResult?.data) ? msgResult.data : [];
      const msgItems: FeedItem[] = msgs.map((m: any) => ({ kind: "message" as const, data: m as Message }));
      const rideItems: FeedItem[] = (rideLogs ?? []).map(r => ({ kind: "ride" as const, data: r }));
      const merged = [...msgItems, ...rideItems].sort((a, b) =>
        itemSortKey(a).localeCompare(itemSortKey(b))
      );
      setFeed(merged);
    } catch (e) {
      console.warn("[GlobalChat] fetchFeed error:", e);
    }
  };

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel("global-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_messages" }, fetchFeed)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_logs" }, fetchFeed)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed]);

  const openLogRide = async () => {
    setShowLogRide(true);
    const bikes = await getUserBikes();
    setUserBikes(bikes);
    if (bikes.length === 1) setLogBikeId(bikes[0].id);
  };

  const closeLogRide = () => {
    setShowLogRide(false);
    setLogBikeId("");
    setLogMileage("");
    setLogNotes("");
    setLogImageFile(null);
    setLogImagePreview(null);
    setLogError("");
  };

  const handleLogImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const cropped = await cropToSquare(f);
    setLogImageFile(cropped);
    setLogImagePreview(URL.createObjectURL(cropped));
  };

  const handleLogRide = async () => {
    if (!logBikeId || !logMileage || parseFloat(logMileage) <= 0) {
      setLogError("Please choose a bike and enter mileage.");
      return;
    }
    setLogSubmitting(true);
    setLogError("");
    try {
      let imageUrl: string | null = null;
      if (logImageFile) imageUrl = await uploadRideImage(logImageFile);
      await insertRideLog(Number(logBikeId), parseFloat(logMileage), logNotes, imageUrl);
      closeLogRide();
      fetchFeed();
    } catch (e: any) {
      setLogError(e.message ?? "Failed to log ride.");
    } finally {
      setLogSubmitting(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !profile) return;
    setSending(true);
    setText("");
    const optimistic: Message = {
      id: Date.now(),
      message_text: trimmed,
      created_at: new Date().toISOString(),
      profile_id: profile.id,
      profiles: { username: profile.username ?? "" },
    };
    setFeed(prev => [...prev, { kind: "message", data: optimistic }]);
    await supabase.from("global_messages").insert({
      profile_id: profile.id,
      message_text: trimmed,
    });
    const mentionedUsernames = [...new Set(
      Array.from(trimmed.matchAll(/@([a-zA-Z0-9_]+)/g), m => m[1].toLowerCase())
    )].filter(u => u !== profile.username?.toLowerCase());
    if (mentionedUsernames.length > 0) {
      const orFilter = mentionedUsernames.map(u => `username.ilike.${u}`).join(",");
      const { data: mentionedProfiles } = await supabase
        .from("profiles").select("id, username").or(orFilter);
      if (mentionedProfiles && mentionedProfiles.length > 0) {
        await supabase.from("notifications").insert(
          (mentionedProfiles as { id: string; username: string }[]).map(p => ({
            user_id: p.id,
            actor_profile_id: profile.id,
            actor_username: profile.username,
            type: "mention",
            bike_name: null,
            is_read: false,
          }))
        );
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const grouped: { date: string; items: FeedItem[] }[] = [];
  for (const item of feed) {
    const label = formatDate(itemSortKey(item));
    const last = grouped[grouped.length - 1];
    if (last && last.date === label) last.items.push(item);
    else grouped.push({ date: label, items: [item] });
  }

  return (
    <>
      <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b-2 border-gray-100 bg-white shrink-0">
          <div className="p-1.5 rounded-xl bg-green-100">
            <Globe size={15} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">
              Let's Ride Bikes!
            </h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Global community board</p>
          </div>
          {feed.length > 0 && (
            <span className="ml-auto text-xs font-bold text-gray-300">{feed.length}</span>
          )}
        </div>

        {/* Feed */}
        <div ref={feedRef} className="h-72 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50">
          {feed.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <Globe size={32} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-400">No messages yet.</p>
              <p className="text-xs text-gray-400">Be the first to say something!</p>
            </div>
          ) : (
            <>
              {grouped.map(({ date, items }) => (
                <div key={date}>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      if (item.kind === "ride") {
                        const isMe = item.data.profileId === profile?.id;
                        return <RideCard key={`ride-${item.data.id}`} ride={item.data} isMe={isMe} onImageClick={setZoomedRideImage} />;
                      }
                      const m = item.data;
                      const isMe = m.profile_id === profile?.id;
                      return (
                        <motion.div
                          key={`msg-${m.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex flex-col mb-2 ${isMe ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5 px-1">
                            {isMe ? "You" : `@${m.profiles?.username ?? "unknown"}`}
                          </span>
                          <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm font-medium leading-relaxed ${
                            isMe
                              ? "bg-green-500 text-white rounded-br-sm"
                              : "bg-white border-2 border-gray-200 text-gray-800 rounded-bl-sm"
                          }`}>
                            {m.message_text}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(m.created_at)}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input row */}
        <form onSubmit={send} className="flex items-center gap-2 p-3 border-t-2 border-gray-100 bg-white shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Talk shop as @${profile?.username ?? "..."}`}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-green-400 transition-colors placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={openLogRide}
            title="Log a Ride"
            className="p-2.5 rounded-2xl bg-red-100 hover:bg-red-200 text-red-500 transition-colors shrink-0"
          >
            <Bike size={18} strokeWidth={2.5} />
          </button>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2.5 rounded-2xl bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-40 shrink-0"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {/* Log a Ride modal */}
      <AnimatePresence>
        {showLogRide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) closeLogRide(); }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden max-h-[90dvh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b-2 border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-red-100">
                    <Bike size={15} className="text-red-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Log a Ride</h3>
                </div>
                <button onClick={closeLogRide} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Image upload */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Ride Photo (optional)</label>
                  {logImagePreview ? (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-200">
                      <img src={logImagePreview} alt="Ride preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setLogImageFile(null); setLogImagePreview(null); }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                      <Camera size={24} className="text-gray-400" strokeWidth={1.5} />
                      <span className="text-xs text-gray-400 font-medium">Tap to add a photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogImage} />
                    </label>
                  )}
                </div>

                {/* Bike selector */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Which Bike?</label>
                  <select
                    value={logBikeId}
                    onChange={e => setLogBikeId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                  >
                    <option value="">Choose a bike...</option>
                    {userBikes.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {userBikes.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Add a bike to your garage first.</p>
                  )}
                </div>

                {/* Mileage */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Mileage</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={logMileage}
                    onChange={e => setLogMileage(e.target.value)}
                    placeholder="e.g. 24.5"
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Ride Notes (optional)</label>
                  <textarea
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder="How was the ride? Trail conditions, epic moments..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-400 transition-colors resize-none"
                  />
                </div>

                {logError && <p className="text-xs text-red-500 font-medium">{logError}</p>}

                <button
                  onClick={handleLogRide}
                  disabled={logSubmitting}
                  className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {logSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {logSubmitting ? "Logging..." : "Log This Ride"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ride photo lightbox — rendered outside scroll container to cover full viewport */}
      {zoomedRideImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
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
