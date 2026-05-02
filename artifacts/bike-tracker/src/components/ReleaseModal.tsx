import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type AppUpdate = {
  id: string;
  version_tag: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

type ProfileUpdateState = {
  last_seen_update_id: string | null;
};

export function ReleaseModal() {
  const { session } = useAuth();
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!session?.user.id) return;
      const [{ data: updateData, error: updateError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from("app_updates").select("id, version_tag, title, content, is_active, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("last_seen_update_id").eq("id", session.user.id).maybeSingle(),
      ]);
      if (updateError) {
        console.error("[ReleaseModal] Failed to load update:", updateError);
        return;
      }
      if (profileError) {
        console.error("[ReleaseModal] Failed to load profile update state:", profileError);
        return;
      }
      const activeUpdate = updateData as AppUpdate | null;
      const profileState = profileData as ProfileUpdateState | null;
      if (activeUpdate && activeUpdate.id !== profileState?.last_seen_update_id) {
        setUpdate(activeUpdate);
        setOpen(true);
      }
    };
    load();
  }, [session?.user.id]);

  const dismiss = async () => {
    if (!session?.user.id || !update) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_update_id: update.id })
      .eq("id", session.user.id);
    if (error) {
      console.error("[ReleaseModal] Failed to save acknowledgment:", error);
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
  };

  if (!open || !update) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b-2 border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-500">What's New · {update.version_tag}</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">{update.title}</h2>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Dismiss release notes">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">{update.content}</div>
          <button
            onClick={dismiss}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
