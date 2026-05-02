import React, { useState, useEffect, useRef } from "react";
import { Bell, X, MessageSquare, AtSign } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Notification {
  id: number;
  type: "comment" | "mention";
  actor_username: string | null;
  bike_name: string | null;
  bike_id: number | null;
  is_read: boolean;
  created_at: string;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifLabel(n: Notification) {
  const who = n.actor_username ? `@${n.actor_username}` : "Someone";
  if (n.type === "comment") return `${who} commented on ${n.bike_name ?? "your bike"}`;
  if (n.type === "mention") return `${who} mentioned you in global chat`;
  return "New notification";
}

export function NotificationBell() {
  const { session } = useAuth();
  const [, setLocation] = useLocation();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!session?.user.id) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, actor_username, bike_name, bike_id, is_read, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      console.error("[NotificationBell] load() FAILED:", error);
    } else {
      console.log("[NotificationBell] load() fetched", data?.length, "notifications:", data);
      setNotifs(data as Notification[]);
    }
  };

  useEffect(() => {
    if (!session?.user.id) return;
    console.log("[NotificationBell] Mounting for user:", session.user.id, "— starting initial load + Realtime subscription.");
    load();
    const channel = supabase
      .channel(`notifs-${session.user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        console.log("[NotificationBell] Realtime event received:", payload);
        load();
      })
      .subscribe((status, err) => {
        if (err) {
          console.error("[NotificationBell] Realtime subscription ERROR:", err);
        } else {
          console.log("[NotificationBell] Realtime subscription status:", status);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter(n => !n.is_read).length;

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.type === "comment" && n.bike_id) {
      setLocation(`/bikes/${n.bike_id}`);
    } else {
      setLocation("/");
    }
  };

  const markAllRead = async () => {
    const ids = notifs.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center py-3">
      <button
        onClick={() => setOpen(p => !p)}
        className={`relative flex flex-col items-center gap-1 transition-colors ${open ? "text-red-500" : "text-gray-400 hover:text-gray-600"}`}
      >
        <div className="relative">
          <Bell size={22} strokeWidth={open ? 2.5 : 1.8} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none border-2 border-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${open ? "text-red-500" : ""}`}>Alerts</span>
        {open && <span className="absolute top-0 w-12 h-0.5 bg-red-500 rounded-full" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full mb-3 right-0 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden z-50"
          style={{ right: "50%", transform: "translateX(50%)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Notifications</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wide">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Bell size={30} className="text-gray-300" />
                <p className="text-sm font-semibold">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    n.is_read ? "bg-white hover:bg-gray-50" : "bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-xl shrink-0 ${
                    n.type === "comment" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                  }`}>
                    {n.type === "comment"
                      ? <MessageSquare size={13} strokeWidth={2.5} />
                      : <AtSign size={13} strokeWidth={2.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? "text-gray-500 font-medium" : "text-gray-800 font-semibold"}`}>
                      {notifLabel(n)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatRelative(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
