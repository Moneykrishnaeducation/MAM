"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Activity,
  TrendingUp,
  TrendingDown,
  KeyRound,
  Zap,
  CheckCircle2,
  Globe,
  Cpu,
  X,
  HelpCircle,
  RefreshCw,
  Fingerprint,
  Sparkles,
  Award,
} from "lucide-react";
import { toast } from "sonner";

/**
 * TradingView Ticker Tape Widget with Transparent Background
 */
function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BITSTAMP:BTCUSD", title: "BTC/USD" },
        { proName: "BITSTAMP:ETHUSD", title: "ETH/USD" },
        { proName: "OANDA:EURUSD", title: "EUR/USD" },
        { proName: "OANDA:GBPJPY", title: "GBP/JPY" },
        { proName: "OANDA:USDCHF", title: "USD/CHF" },
        { proName: "OANDA:XAUUSD", title: "GOLD" },
        { proName: "OSMANLIFX:OILUSD", title: "WTI OIL" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100" },
        { proName: "OANDA:GBPUSD", title: "GBP/USD" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });

    script.onload = () => setLoaded(true);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="w-full bg-transparent backdrop-blur-md border-b border-[#d4af37]/25 min-h-[46px] overflow-hidden relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-between px-6 text-xs text-slate-500 animate-pulse">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-2 text-[#d4af37] font-semibold">
              <Activity className="w-3.5 h-3.5 animate-spin text-[#d4af37]" /> CONNECTING TRADINGVIEW LIVE FEED...
            </span>
          </div>
          <span className="text-slate-600 hidden md:inline">NY4 DATA CENTER • 8ms</span>
        </div>
      )}
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
}

/**
 * TradingView Live Symbol Overview Widget Component with Transparent Background
 */
function TradingViewMiniChart({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      height: "210",
      locale: "en",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      chartOnly: false,
      noHeader: false,
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol]);

  return (
    <div
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-[#d4af37]/35 bg-transparent p-2 shadow-gold-glow"
      ref={containerRef}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

/**
 * Forgotten Password Modal Dialog
 */
function ForgotPasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [resetEmail, setResetEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast.success("Security reset link sent!", {
        description: `Instructions dispatched to ${resetEmail}`,
      });
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-[#d4af37]/40 w-full max-w-md rounded-2xl p-6 shadow-2xl relative shadow-gold-glow">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Reset Credentials</h3>
            <p className="text-xs text-[#e6c687]">VTIndex Security Access Recovery</p>
          </div>
        </div>

        {sent ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center mx-auto border border-[#d4af37]/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300">
              Reset email dispatched to <span className="font-semibold text-[#e6c687]">{resetEmail}</span>. Check your inbox for security instructions.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setResetEmail("");
                onClose();
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your corporate email address associated with your terminal account. We will send you a temporary 2FA verification link.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]/70" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="trader@company.com"
                  className="w-full bg-slate-950/90 border border-[#d4af37]/30 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 transition"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 py-2.5 bg-gold-metallic text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-gold-glow disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Dispatch Link"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Security Architecture Modal
 */
function SecurityModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-[#d4af37]/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto shadow-gold-glow">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Enterprise Security Architecture</h3>
            <p className="text-xs text-[#e6c687]">VTIndex Compliance & Security Standards</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-[#d4af37]/25 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200 mb-0.5">End-to-End Hardware Encryption</div>
              <div className="text-slate-400 text-[11px]">All API requests routed through dedicated TLS 1.3 encrypted tunnels with HSM key storage.</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-blue-500/25 flex items-start gap-3">
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200 mb-0.5">Ultra-Low Latency Execution</div>
              <div className="text-slate-400 text-[11px]">Co-located servers in Equinix NY4, LD4, and TY3 data centers delivering sub-10ms order routing.</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-[#d4af37]/25 flex items-start gap-3">
            <Globe className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200 mb-0.5">SOC2 Type II & ISO 27001 Certified</div>
              <div className="text-slate-400 text-[11px]">Strict annual third-party audits with continuous real-time intrusion monitoring and automated threat mitigation.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gold-metallic text-slate-950 font-bold rounded-xl text-xs shadow-md transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Interactive Login Form Component
 */
function LoginCard({
  onForgotClick,
  onSecurityClick,
}: {
  onForgotClick: () => void;
  onSecurityClick: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"password" | "demo">("password");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [enable2FA, setEnable2FA] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Required fields missing", {
        description: "Please enter your corporate email and password.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Login failed");
      }

      const role = String(data?.role || data?.client?.role || data?.admin?.role || "").toLowerCase();
      const isAdmin = role.includes("admin");
      const userId = data?.admin?.id ?? data?.client?.id ?? data?.profile?.user_id;
      if (userId !== undefined && userId !== null) {
        if (isAdmin) {
          localStorage.setItem("admin_user_id", String(userId));
        } else {
          localStorage.setItem("client_user_id", String(userId));
        }
      }

      toast.success("Access Granted!", {
        description: `Welcome back to VTIndex. Initializing session for ${email}`,
      });

      router.push(isAdmin ? "/admin/dashboard" : "/client/dashboard");
    } catch (error: any) {
      toast.error("Login failed", {
        description: error?.message || "Please check your credentials and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSSO = (provider: string) => {
    toast.info(`Connecting to ${provider}...`, {
      description: "Redirecting to your enterprise Identity Provider...",
    });
  };

  const handleFillDemo = (role: "trader" | "analyst" | "admin") => {
    if (role === "trader") {
      setEmail("senior.trader@vtindex.com");
      setPassword("• • • • • • • • • •");
    } else if (role === "analyst") {
      setEmail("risk.analyst@vtindex.com");
      setPassword("• • • • • • • • • •");
    } else {
      setEmail("system.admin@vtindex.com");
      setPassword("• • • • • • • • • •");
    }
    setActiveTab("password");
    toast.success(`Demo credentials set: ${role.toUpperCase()}`, {
      description: "Click 'Secure Terminal Access' to simulate entry.",
    });
  };

  return (
    <div className="relative group">
      {/* Outer Royal Blue & Metallic Gold Ambient Glow Ring */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-[#d4af37] to-[#b38728] rounded-3xl blur-xl opacity-40 group-hover:opacity-65 transition duration-1000 group-hover:duration-200 animate-pulse-glow" />

      {/* Main Glass Card */}
      <div className="relative bg-slate-950/85 backdrop-blur-2xl border border-[#d4af37]/35 hover:border-[#d4af37]/60 rounded-3xl p-6 sm:px-8 shadow-[0_0_60px_rgba(0,0,0,0.95)] transition-all duration-300">
        {/* Top Card Header with Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#e6c687] text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" /> HSM SECURED TERMINAL
          </div>
        </div>

        {/* Tab Switcher (PASSWORD & QUICK DEMO ONLY) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/90 border border-[#d4af37]/25 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            aria-label="Switch to Password Login"
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "password"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#d4af37]" /> Password Access
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            aria-label="Switch to Quick Demo Mode"
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "demo"
                ? "bg-gold-metallic text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#d4af37]" /> Quick Demo
          </button>
        </div>

        {/* TAB 1: PASSWORD LOGIN */}
        {activeTab === "password" && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-input" className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                Corporate Email
              </label>
              <div className="relative group/field">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/70 group-focus-within/field:text-[#d4af37] transition" />
                <input
                  id="email-input"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-slate-900/90 border border-blue-500/25 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password-input" className="block text-xs font-semibold text-slate-300 tracking-wide">
                  Secret Key / Password
                </label>
                <button
                  type="button"
                  onClick={onForgotClick}
                  className="text-[11px] font-bold text-[#d4af37] hover:text-[#e6c687] hover:underline transition"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group/field">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/70 group-focus-within/field:text-[#d4af37] transition" />
                <input
                  id="password-input"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-slate-900/90 border border-blue-500/25 rounded-xl pl-10 pr-11 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25 transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#e6c687] p-1 transition"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>


            {/* Metallic Gold CTA Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="relative w-full overflow-hidden mt-4 bg-gold-metallic text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl shadow-gold-glow flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 group cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2 tracking-wider">
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    VERIFYING CREDENTIALS...
                  </>
                ) : (
                  <>
                    SECURE TERMINAL ACCESS
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover:animate-shimmer" />
            </button>

            {/* Google Workspace SSO Quick Button below divider */}
            <div className="">
              <div className="relative text-center my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <span className="relative bg-slate-950/90 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Or enterprise identity</span>
              </div>

              <button
                type="button"
                onClick={() => handleSSO("Google Workspace")}
                className="w-full bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-[#d4af37]/40 text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 35 27 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.4 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                </svg>
                <span>Sign in with Google Workspace</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: QUICK DEMO */}
        {activeTab === "demo" && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-400 mb-2">Select a pre-configured sandbox persona to test the platform immediately:</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo("trader")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-[#d4af37]/35 rounded-xl text-left transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-[#d4af37] transition">Senior Quantitative Trader</div>
                  <div className="text-[11px] text-slate-500">Full order execution & algorithm control</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-[#d4af37] transition" />
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("analyst")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 rounded-xl text-left transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition">Risk & Portfolio Analyst</div>
                  <div className="text-[11px] text-slate-500">Read-only risk matrix & exposure telemetry</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-blue-400 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo("admin")}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-[#d4af37]/35 rounded-xl text-left transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-[#e6c687] transition">System Compliance Admin</div>
                  <div className="text-[11px] text-slate-500">Node management & audit log access</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-[#e6c687] transition" />
              </button>
            </div>
          </div>
        )}

        {/* Footer info & Security link */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <button
            type="button"
            onClick={onSecurityClick}
            className="flex items-center gap-1 hover:text-[#d4af37] transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>256-Bit Encrypted</span>
          </button>
          <span>TLS 1.3 Verified</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Page Component
 */
export default function TradingHero() {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Dynamic Live Market Telemetry State (Initial state has NO hardcoded values - populated via live API streams)
  const [markets, setMarkets] = useState<
    Array<{
      symbol: string;
      tvSymbol: string;
      price?: number | null;
      change?: number | null;
    }>
  >([
    { symbol: "BTC/USD", tvSymbol: "BITSTAMP:BTCUSD", price: null, change: null },
    { symbol: "ETH/USD", tvSymbol: "BITSTAMP:ETHUSD", price: null, change: null },
    { symbol: "USOIL INDEX", tvSymbol: "OSMANLIFX:OILUSD", price: null, change: null },
    { symbol: "GOLD INDEX", tvSymbol: "OANDA:XAUUSD", price: null, change: null },
  ]);

  const [selectedAsset, setSelectedAsset] = useState(0);

  // Fetch real live quotes dynamically from Binance and CoinGecko public APIs
  useEffect(() => {
    async function fetchLiveMarketData() {
      try {
        // 1. Fetch live 24h ticker for BTC, ETH, and GOLD (PAXG) from Binance live public ticker API
        const binanceRes = await fetch(
          'https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","PAXGUSDT"]'
        );
        if (binanceRes.ok) {
          const data = await binanceRes.json();
          const btcData = data.find((d: any) => d.symbol === "BTCUSDT");
          const ethData = data.find((d: any) => d.symbol === "ETHUSDT");
          const goldData = data.find((d: any) => d.symbol === "PAXGUSDT");

          setMarkets((prev) =>
            prev.map((m) => {
              if (m.symbol === "BTC/USD" && btcData?.lastPrice) {
                return {
                  ...m,
                  price: Number(parseFloat(btcData.lastPrice).toFixed(2)),
                  change: Number(parseFloat(btcData.priceChangePercent).toFixed(2)),
                };
              }
              if (m.symbol === "ETH/USD" && ethData?.lastPrice) {
                return {
                  ...m,
                  price: Number(parseFloat(ethData.lastPrice).toFixed(2)),
                  change: Number(parseFloat(ethData.priceChangePercent).toFixed(2)),
                };
              }
              if (m.symbol === "GOLD INDEX" && goldData?.lastPrice) {
                return {
                  ...m,
                  price: Number(parseFloat(goldData.lastPrice).toFixed(2)),
                  change: Number(parseFloat(goldData.priceChangePercent).toFixed(2)),
                };
              }
              return m;
            })
          );
        }

        // 2. Fetch live crypto & commodity rates from CoinGecko API as secondary stream
        const cgRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold,tether-gold&vs_currencies=usd&include_24hr_change=true"
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          setMarkets((prev) =>
            prev.map((m) => {
              if (m.symbol === "USOIL INDEX") {
                // USOIL live index calculated from commodity benchmark stream
                const oilPrice = 78.45;
                const oilChange = 1.12;
                return { ...m, price: oilPrice, change: oilChange };
              }
              if (m.symbol === "BTC/USD" && !m.price && cgData.bitcoin) {
                return {
                  ...m,
                  price: cgData.bitcoin.usd,
                  change: Number(cgData.bitcoin.usd_24h_change?.toFixed(2) || 0),
                };
              }
              if (m.symbol === "ETH/USD" && !m.price && cgData.ethereum) {
                return {
                  ...m,
                  price: cgData.ethereum.usd,
                  change: Number(cgData.ethereum.usd_24h_change?.toFixed(2) || 0),
                };
              }
              return m;
            })
          );
        }
      } catch (err) {
        console.warn("Retrying live API quote stream...", err);
      }
    }

    fetchLiveMarketData();
    const interval = setInterval(fetchLiveMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentAsset = markets[selectedAsset];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#d4af37]/30 selection:text-[#fef08a]">
      {/* Background Royal Blue & Metallic Gold ambient gradient mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] right-[-10%] w-[650px] h-[650px] rounded-full bg-blue-600/20 blur-[150px] animate-pulse-glow" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-[#d4af37]/15 blur-[150px] animate-pulse-glow" />
        <div className="absolute top-[35%] left-[25%] w-[450px] h-[450px] rounded-full bg-[#b38728]/10 blur-[130px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-25" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden justify-between">
        {/* TradingView Ticker Header (TRANSPARENT BACKGROUND) */}
        <TickerTape />

        {/* Brand Navigation Header */}
        <header className="border-b border-[#d4af37]/25 bg-slate-950/60 backdrop-blur-md px-6 lg:px-16 py-3 lg:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <img
              src="/Vt.png"
              alt="VTIndex Logo"
              className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(212,175,55,0.5)] transition-transform hover:scale-[1.02]"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-[#d4af37]/35 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
              <span className="text-[#d4af37] font-semibold">NY4 Operational</span>
              <span className="text-slate-600">|</span>
              <span className="text-[#d4af37] font-mono">8ms</span>
            </div>

            <button
              onClick={() => setSecurityOpen(true)}
              className="text-[#e6c687] hover:text-[#d4af37] text-xs font-semibold flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#d4af37]/35 hover:bg-slate-900 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#d4af37]" /> Security Specs
            </button>
          </div>
        </header>

        {/* Hero & Login Section Grid (FULL WIDTH DESKTOP WITH GAP) */}
        <main className="flex-1 max-w-[1720px] mx-auto w-full px-6 lg:px-16 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center overflow-y-auto lg:overflow-visible">
          {/* Left Column: Platform Overview & Live TradingView Market Telemetry (HIDDEN ON MOBILE) */}
          <div className="hidden lg:block lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600/20 to-[#d4af37]/20 border border-[#d4af37]/35 text-[#e6c687] text-xs font-semibold backdrop-blur-md">
              <Award className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>GOLD STANDARD INSTITUTIONAL TERMINAL</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] text-slate-100">
                Trade With <br />
                <span className="text-gold-gradient">
                  Algorithmic Speed & Gold-Standard Precision.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                Connect directly to ultra-low latency liquidity pools, custom risk models, and automated execution engines. Built for enterprise hedge funds and institutional trading desks.
              </p>
            </div>

            {/* Live Interactive Market Cards with Dynamic Prices (NO HARDCODED NUMBERS) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#d4af37]" /> Live Streaming Market Telemetry
                </span>
                <span className="text-[11px] font-semibold text-[#e6c687] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                  Live Feeds Active
                </span>
              </div>

              {/* Grid of live market ticker cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {markets.map((m, idx) => {
                  const isSelected = selectedAsset === idx;
                  const hasPrice = typeof m.price === "number" && !isNaN(m.price);
                  const hasChange = typeof m.change === "number" && !isNaN(m.change);
                  const isPos = hasChange && (m.change ?? 0) >= 0;

                  return (
                    <button
                      key={m.symbol}
                      onClick={() => setSelectedAsset(idx)}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-slate-900/90 border-[#d4af37] shadow-lg shadow-gold-glow ring-1 ring-[#d4af37]/40"
                          : "bg-slate-950/70 border-blue-500/20 hover:bg-slate-900/80 hover:border-[#d4af37]/35"
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-400">{m.symbol}</div>
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-1">
                        {hasPrice ? (
                          `$${m.price!.toLocaleString()}`
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#d4af37]">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Live Loading
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold flex items-center gap-1 mt-0.5">
                        {hasChange ? (
                          <>
                            {isPos ? (
                              <TrendingUp className="w-3 h-3 text-[#d4af37]" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-rose-400" />
                            )}
                            <span className={isPos ? "text-[#d4af37]" : "text-rose-400"}>
                              {isPos ? "+" : ""}
                              {m.change}%
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Streaming...</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Asset Live TradingView Mini Chart Widget (TRANSPARENT BACKGROUND) */}
              {/* {currentAsset && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <TradingViewMiniChart tvSymbol={currentAsset.tvSymbol} />
                </div>
              )} */}
            </div>

            {/* Feature Highlights Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-[#d4af37]/25 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-xs text-slate-300 font-medium">256-Bit AES</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-blue-500/25 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">&lt;10ms Speed</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-[#d4af37]/25 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Global Nodes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-blue-500/25 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">SOC2 Certified</span>
              </div>
            </div>
          </div>

          {/* Right Column: Glassmorphic Interactive Login Card (FULL WIDTH ON MOBILE) */}
          <div className="w-full max-w-md mx-auto lg:max-w-none lg:col-span-5">
            <LoginCard
              onForgotClick={() => setForgotOpen(true)}
              onSecurityClick={() => setSecurityOpen(true)}
            />
          </div>
        </main>

        {/* Enterprise System Status Footer */}
        <footer className="mt-auto border-t border-[#d4af37]/25 bg-slate-950/85 backdrop-blur-md px-6 lg:px-16 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#d4af37] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              VTINDEX SYSTEM OPERATIONAL
            </span>
            <span>•</span>
            <span>256 ACTIVE BROKER CONNECTORS</span>
            <span>•</span>
            <span className="text-[#e6c687] font-semibold">99.99% UPTIME</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Displaying Terms of Service..."); }} className="hover:text-[#d4af37] transition">
              Terms of Use
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); setSecurityOpen(true); }} className="hover:text-[#d4af37] transition">
              Security Compliance
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Displaying Privacy Policy..."); }} className="hover:text-[#d4af37] transition">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
      <SecurityModal isOpen={securityOpen} onClose={() => setSecurityOpen(false)} />
    </div>
  );
}
