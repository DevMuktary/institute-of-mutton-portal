"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  Check,
  Lock,
} from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();

  // Step: 1 = Current Password & OTP Request, 2 = OTP & New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // State
  const [otpToken, setOtpToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Password Strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-gray-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 2, text: "Good", color: "bg-amber-500" };
    return { score: 3, text: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  // Step 1: Submit Current Password
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_OTP",
          currentPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOtpToken(data.otpToken);
        setMaskedEmail(data.emailMasked || "your registered email");
        setStep(2);
        setResendCountdown(60);
      } else {
        setErrorMessage(data.error || "Incorrect current password. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_OTP",
          currentPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOtpToken(data.otpToken);
        setResendCountdown(60);
        setSuccessMessage("A fresh verification code has been dispatched to your email!");
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(data.error || "Failed to resend code.");
      }
    } catch (err) {
      setErrorMessage("Network error. Could not resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Change Password
  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!otp || otp.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage("New password cannot be the same as your current password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_CHANGE",
          currentPassword,
          otp: otp.trim(),
          newPassword,
          otpToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep(3);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2200);
      } else {
        setErrorMessage(data.error || "Failed to change password.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col w-full overflow-x-hidden font-sans">
      {/* Header */}
      <header className="w-full bg-[#001232] px-4 pt-12 pb-24 flex flex-col items-center text-center shrink-0">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Institute of Mutoon</h1>
        <p className="text-[#FFB902] mt-2 text-xs font-bold uppercase tracking-wider">Account Security Portal</p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto px-4 sm:px-8 -mt-12 z-10 relative bg-white rounded-t-3xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-gray-100 mb-12 flex-grow">
        {/* Brand Badge */}
        <div className="flex flex-col items-center -mt-10 mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center border border-gray-100 mb-4">
            <Image src="/mutoon-logo.png" alt="Logo" width={64} height={64} className="object-contain" priority />
          </div>
          <h2 className="text-2xl font-black text-[#001232]">Change Your Password</h2>
          <p className="text-gray-500 mt-1 text-xs leading-relaxed text-center max-w-sm">
            Enter your current password and verify with the OTP sent to your email.
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center gap-2 mb-6 max-w-sm mx-auto">
          <div className="flex items-center gap-2 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 1 ? "bg-[#001232] text-[#FFB902]" : "bg-gray-200 text-gray-400"
              }`}
            >
              1
            </div>
            <span className="text-xs font-bold text-gray-700">Current Pass</span>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#001232]" : "bg-gray-200"}`} />
          </div>

          <div className="flex items-center gap-2 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 2 ? "bg-[#001232] text-[#FFB902]" : "bg-gray-200 text-gray-400"
              }`}
            >
              2
            </div>
            <span className="text-xs font-bold text-gray-700">OTP & New Pass</span>
          </div>
        </div>

        {/* Error Flash */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-snug">{errorMessage}</p>
          </div>
        )}

        {/* Success Flash */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-snug">{successMessage}</p>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 1: CURRENT PASSWORD */}
        {/* ==================================================== */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5 pb-8 px-2 sm:px-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs leading-relaxed">
              <p className="font-bold text-[#001232] mb-1">Verify Your Identity</p>
              Please enter your <strong>Current Password</strong>. You will receive a 6-digit one-time password (OTP) to
              your email address to authorize this password change.
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001232] mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] pr-12 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !currentPassword}
              className="w-full bg-[#001232] text-white font-extrabold py-3.5 px-4 rounded-xl hover:bg-[#001232]/90 transition-all focus:ring-4 focus:ring-[#001232]/20 text-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying & Sending OTP...
                </>
              ) : (
                <>
                  Send Verification Code (OTP)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs font-medium text-gray-400">
              <Link href="/dashboard" className="hover:text-[#001232] transition-colors">
                &larr; Return to Dashboard
              </Link>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 2: OTP & NEW PASSWORD */}
        {/* ==================================================== */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndChange} className="space-y-5 pb-8 px-2 sm:px-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">
                  Code sent to <strong>{maskedEmail}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-bold text-amber-700 hover:underline shrink-0 ml-2"
              >
                Change Current Pass
              </button>
            </div>

            {/* OTP Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#001232]">6-Digit Security Code</label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || isLoading}
                  className="text-xs font-bold text-[#001232] hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 bg-slate-50 border border-gray-300 rounded-xl text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] transition-all"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-[#001232] mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] pr-12 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full flex-1 transition-all ${
                        strength.score >= 1 ? strength.color : "bg-transparent"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full flex-1 transition-all ${
                        strength.score >= 2 ? strength.color : "bg-transparent"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full flex-1 transition-all ${
                        strength.score >= 3 ? strength.color : "bg-transparent"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{strength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-[#001232] mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium text-[#001232] focus:outline-none pr-12 transition-all ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-300 focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="px-4 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                className="flex-1 bg-[#001232] text-white font-extrabold py-3.5 px-4 rounded-xl hover:bg-[#001232]/90 transition-all focus:ring-4 focus:ring-[#001232]/20 text-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm & Save Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 3: SUCCESS */}
        {/* ==================================================== */}
        {step === 3 && (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm animate-bounce">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-[#001232]">Password Changed!</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1.5 mb-6 leading-relaxed">
              Your password has been successfully updated. Redirecting you to your dashboard...
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 rounded-xl bg-[#001232] text-[#FFB902] font-bold text-xs shadow-md hover:bg-[#001232]/90 transition-colors"
            >
              Go to Dashboard Now
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 mt-auto border-t border-gray-100 text-center shrink-0">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Institute of Mutoon &bull; Account Security
        </p>
      </footer>
    </div>
  );
}
