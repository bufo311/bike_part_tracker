import React, { useState } from "react";
import { motion } from "framer-motion";
import { AtSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function UsernameSetup() {
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!trimmed || trimmed.length < 3) {
      setError("Username must be at least 3 characters (letters, numbers, underscores).");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    console.log("Sending payload:", { id: user.id, username: trimmed });

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: trimmed });

    if (error) {
      console.error("Upsert error:", error);
      if (error.code === "23505") {
        setError("That username is already taken. Try another one.");
      } else {
        setError(`Something went wrong: ${error.message}`);
      }
      setLoading(false);
      return;
    }

    await refreshProfile();
  };

  const preview = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "your_username";

  return (
    <div className="min-h-[100dvh] bg-amber-50 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 shadow-lg shadow-blue-200 mb-2">
            <AtSign size={36} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Pick a Username</h1>
          <p className="text-gray-400 font-medium text-sm">
            This is how you'll appear in bike chat. You can only set this once.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-6 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-semibold"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={20}
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. trail_ripper"
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-mono font-medium focus:outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 font-medium pl-1">
              Will appear as <span className="font-bold text-gray-600">@{preview}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow-md shadow-blue-100"
          >
            {loading ? "Saving..." : "Claim Username"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
