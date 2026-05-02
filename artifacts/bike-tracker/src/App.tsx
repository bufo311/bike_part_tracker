import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Warehouse, Calculator, Bike, Users } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import UsernameSetup from "@/pages/UsernameSetup";
import Garage from "@/pages/Garage";
import Dashboard from "@/pages/Dashboard";
import ProfileSetup from "@/pages/ProfileSetup";
import CalculatorPage from "@/pages/Calculator";
import CrewDirectory from "@/pages/CrewDirectory";
import CrewPage from "@/pages/CrewPage";
import { NotificationBell } from "@/components/NotificationBell";
import { ReleaseModal } from "@/components/ReleaseModal";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FIRST_TIMEOUT = 300_000;
const SNOOZE_TIMEOUT = 300_000;

function GoRideModal({ onSnooze }: { onSnooze: () => void }) {
  return (
    <motion.div
      key="go-ride-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ scale: 0.85, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 32, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-6 text-center"
      >
        <div className="w-44 h-44 rounded-full bg-red-50 border-4 border-red-200 flex items-center justify-center">
          <Bike size={80} className="text-red-500" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">
            You've been on the app too long!
          </p>
          <p className="text-3xl font-black text-red-500 uppercase tracking-tight leading-tight">
            Go ride your bike!!
          </p>
        </div>

        <button
          onClick={onSnooze}
          className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-base font-bold uppercase tracking-widest transition-colors shadow-md shadow-red-200"
        >
          Gimme 5 more minutes
        </button>
      </motion.div>
    </motion.div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function BottomNav() {
  const [location, setLocation] = useLocation();

  const tabs = [
    { path: "/", label: "Garage", icon: Warehouse },
    { path: "/crews", label: "Crews", icon: Users },
    { path: "/calculator", label: "Calculator", icon: Calculator },
  ];

  const active = (path: string) => {
    if (path === "/") return location === "/" || location.startsWith("/bikes/");
    if (path === "/crews") return location === "/crews" || location.startsWith("/crews/");
    return location === path;
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t-2 border-gray-200 shadow-lg pb-[env(safe-area-inset-bottom)] md:pb-0">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = active(path);
          return (
            <button
              key={path}
              onClick={() => setLocation(path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative ${
                isActive ? "text-red-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-red-500" : ""}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-12 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
        <NotificationBell />
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Garage} />
        <Route path="/bikes/:id" component={Dashboard} />
        <Route path="/bikes/:id/settings" component={ProfileSetup} />
        <Route path="/crews" component={CrewDirectory} />
        <Route path="/crews/:id" component={CrewPage} />
        <Route path="/calculator" component={CalculatorPage} />
        <Route>
          <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 bg-amber-50">
            <p className="text-6xl font-black text-red-500 mb-4">404</p>
            <p className="text-xl text-gray-500 font-medium mb-8">Page not found</p>
            <a href="#/" className="text-blue-600 hover:underline font-bold">Return to Garage</a>
          </div>
        </Route>
      </Switch>
      <BottomNav />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] bg-amber-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
    </div>
  );
}

function AuthGate() {
  const { session, loading, profile, profileLoading } = useAuth();
  const [showGoRide, setShowGoRide] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = (ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowGoRide(true), ms);
  };

  useEffect(() => {
    if (!session || !profile) return;
    startTimer(FIRST_TIMEOUT);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [!!session, !!profile]);

  const handleSnooze = () => {
    setShowGoRide(false);
    startTimer(SNOOZE_TIMEOUT);
  };

  if (loading || (session && profileLoading)) return <LoadingScreen />;
  if (!session) return <Login />;
  if (!profile) return <UsernameSetup />;
  return (
    <>
      <WouterRouter hook={useHashLocation}>
        <Router />
      </WouterRouter>
      <ReleaseModal />
      <AnimatePresence>
        {showGoRide && <GoRideModal onSnooze={handleSnooze} />}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
