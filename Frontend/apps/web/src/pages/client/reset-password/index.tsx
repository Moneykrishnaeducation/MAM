import { useEffect, useState, type FormEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";

export default function ClientResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showResetToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const rawToken = router.query.token;
    const nextToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    setToken(typeof nextToken === "string" ? nextToken : "");
  }, [router.isReady, router.query.token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error("Your reset link is missing or invalid.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/client/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Unable to reset password.");
      }

      setCompleted(true);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password reset successfully", {
        description: data?.message || "You can now sign in with your new password.",
      });
      showResetToast(data?.message || "Password reset successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password.";
      toast.error("Password reset failed", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | MAM</title>
      </Head>

      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center px-4 py-10">
        {showToast && (
          <div className="fixed top-6 right-6 font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 border z-[999999] bg-slate-900 border-slate-800 text-[#e0b01d] shadow-slate-950/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <Check size={18} />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-12%] right-[-8%] w-[520px] h-[520px] rounded-full bg-blue-600/20 blur-[140px]" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[520px] h-[520px] rounded-full bg-[#d4af37]/15 blur-[140px]" />
        </div>

        <div className="relative w-full max-w-md rounded-3xl border border-[#d4af37]/30 bg-slate-950/90 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.85)] p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#e6c687] text-[11px] font-bold mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            Secure Reset
          </div>

          {completed ? (
            <div className="mt-8 space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center border border-[#d4af37]/35">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Password updated</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Your password has been reset successfully. You can return to the login page and sign in with the new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold-metallic px-4 py-3 text-sm font-black text-slate-950 shadow-gold-glow transition hover:opacity-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {!token ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Missing reset token. Please open the password reset link from your email again.
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/75" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-blue-500/20 bg-slate-900/90 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#e6c687]"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/75" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-blue-500/20 bg-slate-900/90 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#e6c687]"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !token}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-metallic px-4 py-3 text-sm font-black text-slate-950 shadow-gold-glow transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {submitting ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
