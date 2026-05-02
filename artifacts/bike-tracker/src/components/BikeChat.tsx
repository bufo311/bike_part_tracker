import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Comment {
  id: number;
  comment_text: string;
  created_at: string;
  profile_id: string;
  profiles: { username: string } | null;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export function BikeChat({ bikeId, bikeOwnerId, bikeName }: {
  bikeId: number;
  bikeOwnerId: string;
  bikeName: string;
}) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("bike_comments")
      .select("id, comment_text, created_at, profile_id, profiles(username)")
      .eq("bike_id", bikeId)
      .order("created_at", { ascending: true });
    if (data) {
      setComments((data as unknown as Comment[]).map(row => ({
        ...row,
        profiles: Array.isArray((row as unknown as { profiles?: { username: string }[] | { username: string } | null }).profiles)
          ? ((row as unknown as { profiles?: { username: string }[] }).profiles?.[0] ?? null)
          : ((row as unknown as { profiles?: { username: string } | null }).profiles ?? null),
      })));
    }
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`bike-chat-${bikeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bike_comments", filter: `bike_id=eq.${bikeId}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bikeId]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !profile) return;

    const safebikeId: number | null = Number.isFinite(bikeId) ? bikeId : null;
    if (safebikeId === null) {
      console.warn("[BikeChat] bikeId is not a finite number — bike_id will be null:", bikeId);
    }

    setSending(true);
    setText("");
    await supabase.from("bike_comments").insert({
      bike_id: safebikeId,
      profile_id: profile.id,
      comment_text: trimmed,
    });
    supabase.from("activities").insert({
      user_id: profile.id,
      username: profile.username ?? "unknown",
      action: "commented on",
      bike_name: bikeName,
      bike_id: safebikeId,
    }).then(({ error }) => { if (error) console.error("[BikeChat] Activity insert failed:", error); });
    if (profile.id !== bikeOwnerId) {
      const notifPayload = {
        user_id: bikeOwnerId,
        actor_profile_id: profile.id,
        actor_username: profile.username,
        type: "comment",
        bike_name: bikeName,
        bike_id: safebikeId,
        is_read: false,
      };
      console.log("[BikeChat] Notification payload:", notifPayload);
      const { data: notifData, error: notifError } = await supabase.from("notifications").insert(notifPayload).select();
      if (notifError) {
        console.error("[BikeChat] Notification insert FAILED:", notifError);
      } else {
        console.log("[BikeChat] Notification inserted — bike_id saved as:", notifData?.[0]?.bike_id);
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  // Group comments by date
  const grouped: { date: string; items: Comment[] }[] = [];
  for (const c of comments) {
    const label = formatDate(c.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === label) {
      last.items.push(c);
    } else {
      grouped.push({ date: label, items: [c] });
    }
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b-2 border-gray-100">
        <MessageSquare size={18} className="text-blue-600" strokeWidth={2.5} />
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Bike Chat</h2>
        {comments.length > 0 && (
          <span className="ml-auto text-xs font-bold text-gray-400">{comments.length}</span>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="h-72 overflow-y-auto px-4 py-3 space-y-4 bg-gray-50">
        {comments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm py-8">No comments yet. Start the conversation!</div>
        ) : (
          grouped.map(group => (
            <div key={group.date} className="space-y-2.5">
              <div className="flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white border border-gray-200 rounded-full px-2.5 py-1 shadow-sm">{group.date}</span>
              </div>
              <AnimatePresence initial={false}>
                {group.items.map(comment => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[10px] font-black uppercase">
                      {(comment.profiles?.username ?? "?").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-800">{comment.profiles?.username ?? "Unknown"}</span>
                        <span className="text-[10px] text-gray-400">{formatTime(comment.created_at)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 shadow-sm">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.comment_text}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2 p-3 border-t-2 border-gray-100 bg-white">
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400" />
        <button type="submit" disabled={sending || !text.trim()} className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-60">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
