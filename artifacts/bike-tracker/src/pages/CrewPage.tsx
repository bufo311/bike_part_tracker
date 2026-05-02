import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Users, MapPin, ArrowLeft, Copy, CheckCheck, ShieldCheck,
  Bike, ChevronRight, ChevronLeft, Zap, AlertCircle, Loader2,
  Palette, Save, ImagePlus, X, CalendarDays, Clock, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCrewById, getCrewMembers, getCrewBikes, getCrewActivities, getMyCrewIds, joinCrewById,
  updateCrewTheme, updateCrewImages, createRide, fetchCrewRides, toggleRSVP,
  type Crew, type CrewMember, type Bike as BikeType, type Activity, type CrewTheme, type CrewRide,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { CrewChat } from "@/components/CrewChat";

const DEFAULT_THEME: CrewTheme = {
  background: "#fffbeb",
  surface: "#ffffff",
  text: "#111827",
  accent: "#ef4444",
};

// ── Banner carousel ───────────────────────────────────────────────────────────
function BannerCarousel({ images, crewName }: { images: string[]; crewName: string }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className="w-full aspect-video overflow-hidden bg-gray-100 rounded-3xl border-2 border-gray-200">
        <img src={images[0]} alt={crewName} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-3xl border-2 border-gray-200 bg-gray-100 group">
      {images.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={`${crewName} — photo ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-400 ${i === current ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <button
        onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all"
        aria-label="Previous"
      >
        <ChevronLeft size={15} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => setCurrent(c => (c + 1) % images.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all"
        aria-label="Next"
      >
        <ChevronRight size={15} strokeWidth={2.5} />
      </button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/50 hover:bg-white/80"}`}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Theme colours ─────────────────────────────────────────────────────────────
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

function MiniBike({ themeIndex, size = 72 }: { themeIndex: number; size?: number }) {
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

// ── Header membership widgets ─────────────────────────────────────────────────
function AdminWidget({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(inviteCode); } catch {
      const el = document.createElement("textarea");
      el.value = inviteCode;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border-2 border-amber-200 rounded-2xl">
        <ShieldCheck size={14} className="text-amber-600 shrink-0" strokeWidth={2} />
        <span className="font-mono text-sm font-black text-gray-800 tracking-widest select-all">{inviteCode}</span>
      </div>
      <button
        onClick={handleCopy}
        title="Copy invite code"
        className={`p-2 rounded-2xl transition-colors border-2 ${copied ? "bg-green-50 border-green-200 text-green-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600"}`}
      >
        {copied ? <CheckCheck size={15} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

function MemberBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border-2 border-red-200 rounded-2xl shrink-0">
      <Users size={13} className="text-red-500 shrink-0" strokeWidth={2.5} />
      <span className="text-xs font-black text-red-600 uppercase tracking-wider">Member</span>
    </div>
  );
}

function GuestJoinWidget({ crew, onJoined }: { crew: Crew; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (trimmed !== crew.inviteCode.toUpperCase()) {
      setError("Invalid code");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await joinCrewById(crew.id);
    if (res.success) {
      onJoined();
    } else {
      setError(res.error ?? "Could not join");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Invite code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          className="w-28 px-3 py-2 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-900 uppercase tracking-widest focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-300 placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
        />
        <button
          onClick={handleJoin}
          disabled={submitting || code.trim().length === 0}
          className="px-3 py-2 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : "Join"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
          <AlertCircle size={10} />
          {error}
        </div>
      )}
    </div>
  );
}

// ── Roster ────────────────────────────────────────────────────────────────────
function MemberAvatar({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const initials = username
    .split(/[\s_\-.]/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("") || username[0]?.toUpperCase() || "?";
  const colors = [
    "bg-red-100 text-red-600", "bg-amber-100 text-amber-700",
    "bg-green-100 text-green-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div className="relative">
        <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center font-black text-sm border-2 border-white shadow-sm`}>
          {initials}
        </div>
        {isAdmin && (
          <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center">
            <ShieldCheck size={9} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide max-w-[52px] truncate text-center">
        {username}
      </span>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CrewActivityFeed({ activities }: { activities: Activity[] }) {
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden" style={{ backgroundColor: "var(--crew-surface)" }}>
      <div className="px-4 py-3 border-b-2 border-gray-100 flex items-center gap-2">
        <Zap size={13} className="text-amber-500" />
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Activity</h2>
      </div>
      <div className="max-h-[360px] overflow-y-auto overscroll-contain">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Zap size={28} className="text-gray-200" strokeWidth={1.5} />
            <p className="text-xs text-gray-400 font-medium">No crew activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.map(a => {
              const clickable = !!a.bike_id;
              return clickable ? (
                <button key={a.id} onClick={() => setLocation(`/bikes/${a.bike_id}`)}
                  className="w-full px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-gray-50">
                  <p className="text-sm text-gray-700 leading-snug">
                    <span className="font-bold text-gray-900">{a.username}</span>{" "}{a.action}
                    {a.bike_name && <> — <span className="italic text-gray-500">{a.bike_name}</span></>}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">{relativeTime(a.created_at)}</p>
                </button>
              ) : (
                <div key={a.id} className="px-4 py-2.5">
                  <p className="text-sm text-gray-700 leading-snug">
                    <span className="font-bold text-gray-900">{a.username}</span>{" "}{a.action}
                    {a.bike_name && <> — <span className="italic text-gray-500">{a.bike_name}</span></>}
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

// ── Bikes list ────────────────────────────────────────────────────────────────
function CrewBikesList({ bikes, currentUserId }: { bikes: BikeType[]; currentUserId?: string }) {
  const [, setLocation] = useLocation();
  if (bikes.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-gray-200 shadow-sm flex flex-col items-center justify-center py-14 gap-3 text-center" style={{ backgroundColor: "var(--crew-surface)" }}>
        <Bike size={40} className="text-gray-200" strokeWidth={1.5} />
        <p className="text-xs text-gray-400 font-medium">No bikes added yet.</p>
      </div>
    );
  }
  const sorted = [...bikes].sort((a, b) => {
    const aIsMine = a.userId === currentUserId ? 0 : 1;
    const bIsMine = b.userId === currentUserId ? 0 : 1;
    if (aIsMine !== bIsMine) return aIsMine - bIsMine;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return (
    <div className="space-y-3">
      {sorted.map((bike, i) => (
        <motion.div key={bike.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <button
            onClick={() => setLocation(`/bikes/${bike.id}`)}
            className="w-full rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden flex items-center gap-4 p-4 text-left transition-colors hover:brightness-95"
            style={{ backgroundColor: "var(--crew-surface)" }}
          >
            <div className="rounded-2xl border border-gray-100 p-2 shrink-0" style={{ backgroundColor: "color-mix(in srgb, var(--crew-accent, #ef4444) 10%, transparent)" }}>
              <MiniBike themeIndex={bike.themeIndex} size={60} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold truncate uppercase tracking-tight" style={{ color: "var(--crew-text)" }}>
                {bike.ownerUsername}'s {bike.name}
              </p>
              <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase">
                {bike.ridingStyle} · {bike.ridingFrequency.replace("_", " ")}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Ride date helpers ─────────────────────────────────────────────────────────
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatRideDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatRideTime(t: string): string {
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// ── Crew ride card (compact, used within CrewPage) ────────────────────────────
function CrewRideCard({
  ride,
  userId,
  onToggleRSVP,
  accentColor,
}: {
  ride: CrewRide;
  userId?: string;
  onToggleRSVP: (ride: CrewRide) => void;
  accentColor: string;
}) {
  const going = userId ? ride.rsvpUserIds.includes(userId) : false;
  return (
    <div
      className="rounded-2xl border-2 border-gray-200 overflow-hidden"
      style={{ backgroundColor: "var(--crew-surface)" }}
    >
      <div className="px-4 py-3 space-y-1.5">
        <p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight">
          {ride.title}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-gray-400 shrink-0" />
            <span className="text-xs font-bold text-gray-700">{formatRideDate(ride.rideDate)}</span>
          </div>
          {ride.rideTime && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span className="text-xs font-bold text-gray-700">{formatRideTime(ride.rideTime)}</span>
            </div>
          )}
        </div>
        {ride.location && (
          <p className="text-xs text-gray-500 font-medium">📍 {ride.location}</p>
        )}
        {ride.description && (
          <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-2">
            {ride.description}
          </p>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400">
          {ride.rsvpCount} {ride.rsvpCount === 1 ? "going" : "going"}
        </span>
        {userId && (
          <button
            onClick={() => onToggleRSVP(ride)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
            style={
              going
                ? { backgroundColor: "#f3f4f6", color: "#4b5563" }
                : { backgroundColor: accentColor, color: "#ffffff" }
            }
          >
            {going ? "Cancel RSVP" : "I'm Going!"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
type Tab = "chat" | "bikes" | "rides";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "bikes", label: "Bikes" },
    { id: "rides", label: "Rides" },
  ];
  return (
    <div className="flex rounded-2xl border-2 border-gray-200 p-1 gap-1" style={{ backgroundColor: "var(--crew-surface)" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            active === t.id ? "text-white shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
          style={active === t.id ? { backgroundColor: "var(--crew-accent)" } : {}}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type MembershipStatus = "admin" | "member" | "guest";

export default function CrewPage({ params }: { params: { id: string } }) {
  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [bikes, setBikes] = useState<BikeType[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>("guest");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [localTheme, setLocalTheme] = useState<CrewTheme>(DEFAULT_THEME);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  // Image management
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [imagesSaving, setImagesSaving] = useState(false);
  const [imagesSaved, setImagesSaved] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { session } = useAuth();

  // Crew rides + schedule form state
  const [crewRides, setCrewRides] = useState<CrewRide[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [rideTitle, setRideTitle] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [rideLocation, setRideLocation] = useState("");
  const [rideDesc, setRideDesc] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const loadPage = async () => {
    const [crewData, memberData, bikeData, activityData, myIds, ridesData] = await Promise.all([
      getCrewById(params.id),
      getCrewMembers(params.id),
      getCrewBikes(params.id),
      getCrewActivities(params.id),
      getMyCrewIds(),
      fetchCrewRides(params.id),
    ]);
    setCrew(crewData);
    if (crewData?.themeSettings) setLocalTheme(crewData.themeSettings);
    setLocalImages(crewData?.bannerImages ?? []);
    setMembers(memberData);
    setBikes(bikeData);
    setActivities(activityData);
    setCrewRides(ridesData);

    if (crewData && session?.user.id) {
      if (session.user.id === crewData.adminId) {
        setMembershipStatus("admin");
      } else if (myIds.has(crewData.id)) {
        setMembershipStatus("member");
      } else {
        setMembershipStatus("guest");
      }
    } else {
      setMembershipStatus("guest");
    }
  };

  useEffect(() => {
    loadPage().finally(() => setLoading(false));
  }, [params.id, session?.user.id]);

  const resetScheduleForm = () => {
    setRideTitle(""); setRideDate(""); setRideTime("");
    setRideLocation(""); setRideDesc(""); setScheduleError(null);
    setShowScheduleForm(false);
  };

  const handleScheduleRide = async () => {
    if (!crew || !rideTitle.trim() || !rideDate) return;
    setScheduleSaving(true);
    setScheduleError(null);
    const res = await createRide({
      crewId: crew.id,
      title: rideTitle,
      rideDate,        // YYYY-MM-DD from the date input — no Date() conversion
      rideTime,
      location: rideLocation,
      description: rideDesc,
    });
    setScheduleSaving(false);
    if (!res.success) { setScheduleError(res.error ?? "Could not create ride"); return; }
    resetScheduleForm();
    setCrewRides(await fetchCrewRides(crew.id));
  };

  const handleCrewRideRSVP = async (ride: CrewRide) => {
    const userId = session?.user.id;
    if (!userId) return;
    const going = ride.rsvpUserIds.includes(userId);
    setCrewRides(prev => prev.map(r => r.id === ride.id ? {
      ...r,
      rsvpCount: going ? r.rsvpCount - 1 : r.rsvpCount + 1,
      rsvpUserIds: going ? r.rsvpUserIds.filter(id => id !== userId) : [...r.rsvpUserIds, userId],
    } : r));
    const result = await toggleRSVP(ride.id, userId);
    if (result.error) {
      setCrewRides(prev => prev.map(r => r.id === ride.id ? {
        ...r,
        rsvpCount: going ? r.rsvpCount + 1 : r.rsvpCount - 1,
        rsvpUserIds: going ? [...r.rsvpUserIds, userId] : r.rsvpUserIds.filter(id => id !== userId),
      } : r));
    }
  };

  const saveTheme = async () => {
    if (!crew) return;
    setThemeSaving(true);
    await updateCrewTheme(crew.id, localTheme);
    setThemeSaving(false);
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const total = localImages.length + newImageFiles.length + files.length;
    if (total > 3) {
      setImagesError(`Max 3 images total. Remove some before adding more.`);
      e.target.value = "";
      return;
    }
    setImagesError(null);
    const previews = files.map(f => URL.createObjectURL(f));
    setNewImageFiles(prev => [...prev, ...files]);
    setNewImagePreviews(prev => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeNewImage = (i: number) => {
    URL.revokeObjectURL(newImagePreviews[i]);
    setNewImageFiles(prev => prev.filter((_, j) => j !== i));
    setNewImagePreviews(prev => prev.filter((_, j) => j !== i));
  };

  const saveImages = async () => {
    if (!crew) return;
    setImagesSaving(true);
    setImagesError(null);
    const result = await updateCrewImages(crew.id, newImageFiles, localImages);
    setImagesSaving(false);
    if (!result.success) {
      setImagesError(result.error ?? "Could not save images");
      return;
    }
    newImagePreviews.forEach(u => URL.revokeObjectURL(u));
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setImagesSaved(true);
    setTimeout(() => setImagesSaved(false), 2000);
    await loadPage();
  };

  const memberUserIds = new Set(members.map(m => m.userId));

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!crew) {
    return (
      <div className="min-h-[100dvh] bg-amber-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Users size={48} className="text-gray-300" strokeWidth={1.5} />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Crew not found</p>
        <button onClick={() => setLocation("/crews")} className="text-red-500 font-bold text-sm hover:underline">
          Back to Crews
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24"
      style={{
        backgroundColor: localTheme.background,
        "--crew-bg": localTheme.background,
        "--crew-surface": localTheme.surface,
        "--crew-text": localTheme.text,
        "--crew-accent": localTheme.accent,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="px-4 py-4 border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm" style={{ backgroundColor: localTheme.surface }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/crews")}
            className="p-2 rounded-2xl hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none truncate" style={{ color: localTheme.text }}>
              {crew.name}
            </h1>
            {crew.location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-gray-400 shrink-0" strokeWidth={2} />
                <span className="text-xs text-gray-500 font-medium">{crew.location}</span>
              </div>
            )}
          </div>

          {/* Membership widget */}
          {membershipStatus === "admin" && <AdminWidget inviteCode={crew.inviteCode} />}
          {membershipStatus === "member" && <MemberBadge />}
          {membershipStatus === "guest" && (
            <GuestJoinWidget
              crew={crew}
              onJoined={() => {
                setMembershipStatus("member");
                loadPage();
              }}
            />
          )}
        </div>

        {/* Member count sub-row */}
        <div className="flex items-center gap-1.5 mt-2 pl-12">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </header>

      <main className="px-4 sm:px-6 max-w-5xl mx-auto pt-5">
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">

          {/* Left column: banner + roster */}
          <div className="w-full lg:w-72 xl:w-80 mb-5 lg:mb-0 lg:sticky lg:top-24 space-y-4">
            {(() => {
              const displayImages = crew.bannerImages.length > 0
                ? crew.bannerImages
                : crew.bannerImageUrl ? [crew.bannerImageUrl] : [];
              return displayImages.length > 0
                ? <BannerCarousel images={displayImages} crewName={crew.name} />
                : (
                  <div className="w-full aspect-video rounded-3xl border-2 border-gray-200 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${localTheme.accent}22, ${localTheme.accent}44)` }}>
                    <Users size={56} strokeWidth={1.5} style={{ color: `${localTheme.accent}99` }} />
                  </div>
                );
            })()}

            <div className="rounded-3xl border-2 border-gray-200 p-4" style={{ backgroundColor: localTheme.surface }}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-gray-400 shrink-0" strokeWidth={2} />
                <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider">Crew Roster</h2>
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium text-center py-4">No members yet</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {members.map(m => (
                    <MemberAvatar key={m.userId} username={m.username} isAdmin={m.userId === crew.adminId} />
                  ))}
                </div>
              )}
            </div>

            {/* Admin image manager */}
            {membershipStatus === "admin" && (
              <div className="rounded-3xl border-2 border-gray-200 p-4 space-y-3" style={{ backgroundColor: localTheme.surface }}>
                <div className="flex items-center gap-2">
                  <ImagePlus size={14} className="text-gray-400 shrink-0" strokeWidth={2} />
                  <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider">Crew Images (Max 3)</h2>
                </div>

                {/* Saved + new image thumbnails */}
                {(localImages.length > 0 || newImagePreviews.length > 0) && (
                  <div className="grid grid-cols-3 gap-2">
                    {localImages.map((url, i) => (
                      <div key={url} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={url} alt={`Crew image ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setLocalImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                          aria-label="Remove"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                    {newImagePreviews.map((url, i) => (
                      <div key={url} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-green-400">
                        <img src={url} alt={`New image ${i + 1}`} className="w-full h-full object-cover opacity-80" />
                        <button
                          onClick={() => removeNewImage(i)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                          aria-label="Remove"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                        <span className="absolute bottom-0 inset-x-0 text-center text-[9px] font-bold text-white bg-green-500/80 py-0.5">NEW</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add more button */}
                {(localImages.length + newImageFiles.length) < 3 ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <ImagePlus size={20} className="text-gray-300" strokeWidth={1.5} />
                    <span className="text-xs text-gray-400 font-medium">
                      Add photo ({3 - localImages.length - newImageFiles.length} slot{3 - localImages.length - newImageFiles.length !== 1 ? "s" : ""} left)
                    </span>
                  </button>
                ) : (
                  <p className="text-center text-xs text-gray-400 font-medium py-2">Maximum 3 images reached</p>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewImages}
                />

                {imagesError && (
                  <div className="text-xs font-bold text-red-600 bg-red-50 rounded-xl px-3 py-2">{imagesError}</div>
                )}

                {(localImages.length > 0 || newImageFiles.length > 0) && (
                  <button
                    onClick={saveImages}
                    disabled={imagesSaving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: localTheme.accent }}
                  >
                    {imagesSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : imagesSaved ? (
                      <><CheckCheck size={13} /> Saved!</>
                    ) : (
                      <><Save size={13} /> Save Images</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Admin theme panel */}
            {membershipStatus === "admin" && (
              <div className="rounded-3xl border-2 border-gray-200 p-4 space-y-3" style={{ backgroundColor: localTheme.surface }}>
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-gray-400 shrink-0" strokeWidth={2} />
                  <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider">Theme Controls</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { key: "background", label: "Background" },
                      { key: "surface",    label: "Cards" },
                      { key: "text",       label: "Text" },
                      { key: "accent",     label: "Accent" },
                    ] as { key: keyof CrewTheme; label: string }[]
                  ).map(({ key, label }) => (
                    <label key={key} className="flex flex-col gap-1 cursor-pointer">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={localTheme[key]}
                          onChange={e => setLocalTheme(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-8 h-8 rounded-lg border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                        />
                        <span className="text-xs font-mono text-gray-500 uppercase">{localTheme[key]}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={saveTheme}
                  disabled={themeSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: localTheme.accent }}
                >
                  {themeSaving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : themeSaved ? (
                    <><CheckCheck size={13} /> Saved!</>
                  ) : (
                    <><Save size={13} /> Save Theme</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right column: tabs */}
          <div className="flex-1 space-y-4 min-w-0">
            <TabBar active={activeTab} onChange={setActiveTab} />

            <AnimatePresence mode="wait">
              {activeTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                  <CrewChat
                    crewId={crew.id}
                    crewName={crew.name}
                    adminId={crew.adminId}
                    memberUserIds={memberUserIds}
                  />
                </motion.div>
              )}
              {activeTab === "bikes" && (
                <motion.div key="bikes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                  <CrewBikesList bikes={bikes} currentUserId={session?.user.id} />
                </motion.div>
              )}
              {activeTab === "rides" && (
                <motion.div key="rides" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-4">

                  {/* Schedule ride: button or expanded form */}
                  {(membershipStatus === "member" || membershipStatus === "admin") && (
                    <div className="rounded-3xl border-2 border-gray-200 overflow-hidden" style={{ backgroundColor: "var(--crew-surface)" }}>
                      {!showScheduleForm ? (
                        <button
                          onClick={() => setShowScheduleForm(true)}
                          className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left transition-opacity hover:opacity-90"
                          style={{ backgroundColor: localTheme.accent }}
                        >
                          <CalendarDays size={16} className="text-white shrink-0" strokeWidth={2} />
                          <span className="text-sm font-black text-white uppercase tracking-widest flex-1">
                            Schedule a Group Ride
                          </span>
                          <Plus size={16} className="text-white shrink-0" strokeWidth={2.5} />
                        </button>
                      ) : (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={14} className="text-gray-500" strokeWidth={2} />
                              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                Schedule a Group Ride
                              </span>
                            </div>
                            <button
                              onClick={resetScheduleForm}
                              className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <X size={15} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Title */}
                          <input
                            type="text"
                            placeholder="Ride title *"
                            value={rideTitle}
                            onChange={e => setRideTitle(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-300 transition-colors"
                          />

                          {/* Date + time row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Date *
                              </label>
                              <input
                                type="date"
                                value={rideDate}
                                min={todayStr}
                                onChange={e => setRideDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-300 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Time
                              </label>
                              <input
                                type="time"
                                value={rideTime}
                                onChange={e => setRideTime(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-red-300 transition-colors"
                              />
                            </div>
                          </div>

                          {/* Location */}
                          <input
                            type="text"
                            placeholder="Location (optional)"
                            value={rideLocation}
                            onChange={e => setRideLocation(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-300 transition-colors"
                          />

                          {/* Description */}
                          <textarea
                            placeholder="Description (optional)"
                            value={rideDesc}
                            onChange={e => setRideDesc(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-300 transition-colors resize-none"
                          />

                          {scheduleError && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-xl px-3 py-2">
                              <AlertCircle size={12} />
                              {scheduleError}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={resetScheduleForm}
                              className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleScheduleRide}
                              disabled={scheduleSaving || !rideTitle.trim() || !rideDate}
                              className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-colors disabled:opacity-40"
                              style={{ backgroundColor: localTheme.accent }}
                            >
                              {scheduleSaving ? (
                                <><Loader2 size={13} className="animate-spin" /> Saving…</>
                              ) : (
                                <><CalendarDays size={13} /> Schedule Ride</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upcoming crew rides */}
                  {crewRides.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                        Upcoming Rides
                      </p>
                      {crewRides.map(ride => (
                        <CrewRideCard
                          key={ride.id}
                          ride={ride}
                          userId={session?.user.id}
                          onToggleRSVP={handleCrewRideRSVP}
                          accentColor={localTheme.accent}
                        />
                      ))}
                    </div>
                  )}

                  {/* Activity feed */}
                  <div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">
                      Activity
                    </p>
                    <CrewActivityFeed activities={activities} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
