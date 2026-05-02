import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Bike, CheckCircle2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { checkInviteCode, consumeInviteCode } from "@/lib/data";

type Mode = "login" | "signup" | "set-password" | "done";

const INPUT_CLS =
  "w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-medium focus:outline-none focus:border-red-400 transition-colors placeholder:text-gray-400";
const LABEL_CLS = "block text-xs font-bold text-gray-500 uppercase tracking-wider";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get("type");
    if (type === "invite" || type === "recovery") setMode("set-password");

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set-password");
    });
    return () => subscription.unsubscribe();
  }, []);

  const switchMode = (next: "login" | "signup") => {
    setError(null);
    setInviteCode("");
    setMode(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Trim email — trailing whitespace from autofill causes a 422 from Supabase.
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      // Surface the real Supabase message so failures are always visible.
      setError(error.message || "Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validate invite code first — before touching auth
    const check = await checkInviteCode(inviteCode);
    if (!check.valid) {
      setError("Invalid or expired invite code.");
      setLoading(false);
      return;
    }

    // 2. Create the account
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 3. With email confirmation OFF, signUp() returns a full session immediately.
    //    If it is null the Supabase project still requires email confirmation —
    //    abort rather than silently leaving the invite un-burned.
    if (!data.session || !data.user) {
      setError("Account created but a session was not returned. Ensure email confirmation is disabled in your Supabase project.");
      setLoading(false);
      return;
    }

    // 4. Force-apply the session so every subsequent request carries the
    //    authenticated JWT — closes the race window before the RLS-protected update.
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    // 5. Burn the invite — runs as the authenticated new user.
    await consumeInviteCode(inviteCode, data.user.id);

    // The onAuthStateChange listener in auth.tsx picks up the SIGNED_IN event
    // fired by setSession above and routes the user into the app automatically.
    setLoading(false);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      setMode("done");
    }
    setLoading(false);
  };

  const errorBox = error && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm font-semibold"
    >
      {error}
    </motion.div>
  );

  const logo = (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500 shadow-lg shadow-red-200 mb-2">
        <Bike size={40} className="text-white" strokeWidth={2} />
      </div>
      <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Bike Tracker</h1>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-amber-50 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8"
      >
        {logo}

        <AnimatePresence mode="wait">

          {/* ── Login ── */}
          {mode === "login" && (
            <motion.form
              key="login"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleLogin}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-6 space-y-5"
            >
              <p className="text-gray-400 font-medium text-center text-sm">Sign in to access your garage</p>

              {errorBox}

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" autoComplete="email" required value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={INPUT_CLS} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" autoComplete="current-password" required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={INPUT_CLS} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-base font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow-md shadow-red-100">
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <p className="text-center text-sm text-gray-400">
                Have an invite code?{" "}
                <button type="button" onClick={() => switchMode("signup")}
                  className="font-bold text-red-500 hover:text-red-600 underline-offset-2 hover:underline">
                  Create account
                </button>
              </p>
            </motion.form>
          )}

          {/* ── Sign Up ── */}
          {mode === "signup" && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSignUp}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-6 space-y-5"
            >
              <p className="text-gray-400 font-medium text-center text-sm">Create your account — invite required</p>

              {errorBox}

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Invite Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="8-character code"
                    maxLength={8}
                    className={`${INPUT_CLS} font-mono tracking-widest`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" autoComplete="email" required value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={INPUT_CLS} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" autoComplete="new-password" required minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className={INPUT_CLS} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-base font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow-md shadow-red-100">
                {loading ? "Creating account…" : "Create Account"}
              </button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")}
                  className="font-bold text-red-500 hover:text-red-600 underline-offset-2 hover:underline">
                  Sign in
                </button>
              </p>
            </motion.form>
          )}

          {/* ── Set password (invite / recovery) ── */}
          {mode === "set-password" && (
            <motion.form
              key="set-password"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSetPassword}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-6 space-y-5"
            >
              <div className="text-center space-y-1">
                <p className="text-gray-900 font-bold text-base">Welcome! Set your password</p>
                <p className="text-gray-400 text-sm font-medium">Choose a password to complete your account setup.</p>
              </div>

              {errorBox}

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" autoComplete="new-password" required value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" className={INPUT_CLS} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" autoComplete="new-password" required value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className={INPUT_CLS} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-base font-bold uppercase tracking-widest transition-colors disabled:opacity-60 shadow-md shadow-red-100">
                {loading ? "Saving…" : "Set Password & Sign In"}
              </button>
            </motion.form>
          )}

          {/* ── Success ── */}
          {mode === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-8 text-center space-y-3"
            >
              <CheckCircle2 size={48} className="text-red-500 mx-auto" />
              <p className="text-gray-900 font-bold text-lg">Password set!</p>
              <p className="text-gray-400 text-sm font-medium">Taking you to your garage…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
