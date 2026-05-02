import React, { useState, useEffect } from "react";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fetchUpcomingRides, toggleRSVP, type CrewRide } from "@/lib/data";
import { useAuth } from "@/lib/auth";

// Parse a YYYY-MM-DD string as a local date — avoids UTC midnight TZ shift.
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Format a Postgres time string "HH:MM:SS" → "9:30 AM"
function formatRideTime(t: string): string {
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function RideCard({
  ride,
  userId,
  onToggle,
  index,
}: {
  ride: CrewRide;
  userId?: string;
  onToggle: (ride: CrewRide) => void;
  index: number;
}) {
  const going = userId ? ride.rsvpUserIds.includes(userId) : false;
  const dateObj = parseDateStr(ride.rideDate);
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dayLabel =
    ride.rideDate === todayStr
      ? "Today"
      : ride.rideDate === tomorrowStr
      ? "Tomorrow"
      : format(dateObj, "EEE, MMM d");
  const yearLabel = format(dateObj, "yyyy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Crew badge */}
      <div className="px-4 pt-4 pb-0 flex items-center gap-2">
        {ride.crewBannerUrl ? (
          <img
            src={ride.crewBannerUrl}
            alt={ride.crewName}
            className="w-6 h-6 rounded-lg object-cover border border-gray-100 shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Users size={12} className="text-red-400" />
          </div>
        )}
        <span className="text-[11px] font-black text-red-500 uppercase tracking-widest truncate">
          {ride.crewName}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pt-2 pb-0 space-y-1.5">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-tight">
          {ride.title}
        </h3>

        {/* Date + time row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-gray-400 shrink-0" />
            <span className="text-sm font-bold text-gray-800">{dayLabel}</span>
            {ride.rideDate !== todayStr && ride.rideDate !== tomorrowStr && (
              <span className="text-xs text-gray-400 font-medium">{yearLabel}</span>
            )}
          </div>
          {ride.rideTime && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400 shrink-0" />
              <span className="text-sm font-bold text-gray-700">
                {formatRideTime(ride.rideTime)}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {ride.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 font-medium leading-snug">
              {ride.location}
            </span>
          </div>
        )}

        {/* Description */}
        {ride.description && (
          <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3">
            {ride.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 mt-3 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500">
            {ride.rsvpCount} {ride.rsvpCount === 1 ? "going" : "going"}
          </span>
        </div>
        {userId && (
          <button
            onClick={() => onToggle(ride)}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
              going
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-red-500 text-white hover:bg-red-600 shadow-sm"
            }`}
          >
            {going ? "Cancel RSVP" : "I'm Going!"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function RideBoard() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [rides, setRides] = useState<CrewRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingRides()
      .then(setRides)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (ride: CrewRide) => {
    if (!userId) return;
    const going = ride.rsvpUserIds.includes(userId);
    // Optimistic update
    setRides(prev =>
      prev.map(r =>
        r.id === ride.id
          ? {
              ...r,
              rsvpCount: going ? r.rsvpCount - 1 : r.rsvpCount + 1,
              rsvpUserIds: going
                ? r.rsvpUserIds.filter(id => id !== userId)
                : [...r.rsvpUserIds, userId],
            }
          : r,
      ),
    );
    const result = await toggleRSVP(ride.id, userId);
    if (result.error) {
      // Revert on failure
      setRides(prev =>
        prev.map(r =>
          r.id === ride.id
            ? {
                ...r,
                rsvpCount: going ? r.rsvpCount + 1 : r.rsvpCount - 1,
                rsvpUserIds: going
                  ? [...r.rsvpUserIds, userId]
                  : r.rsvpUserIds.filter(id => id !== userId),
              }
            : r,
        ),
      );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-amber-50 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-24">
      <header className="px-4 py-4 bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="p-2 rounded-2xl bg-red-50 border-2 border-red-100 shrink-0">
            <CalendarDays size={20} className="text-red-500" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">
              Ride Board
            </h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Upcoming group rides from all crews
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 max-w-2xl mx-auto pt-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div className="w-24 h-24 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
              <CalendarDays size={36} className="text-red-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-800 uppercase tracking-tight">
                Nothing scheduled yet
              </p>
              <p className="text-sm text-gray-400 font-medium mt-1 max-w-xs mx-auto">
                Head to a crew page to schedule the next group ride.
              </p>
            </div>
          </div>
        ) : (
          rides.map((ride, i) => (
            <RideCard
              key={ride.id}
              ride={ride}
              userId={userId}
              onToggle={handleToggle}
              index={i}
            />
          ))
        )}
      </main>
    </div>
  );
}
