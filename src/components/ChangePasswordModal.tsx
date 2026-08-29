"use client";

import { useState, useEffect, useRef } from "react";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  Check,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  // Wizard Step: 1 = Enter Current Password & Request OTP, 2 = Enter OTP & New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility Toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Flow State
  const [otpToken, setOtpToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Resend OTP Timer
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCurrentPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage("");
      setSuccessMessage("");
      setOtpToken("");
      setResendCountdown(0);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendCountdown]);

  // Password Strength Checker
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

  // Step 1: Submit Current Password & Request OTP
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
        setErrorMessage(data.error || "Failed to verify current password.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please check your connection and try again.");
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
        setSuccessMessage("A fresh verification code has been sent!");
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
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-scale-up">
        {/* Top Header */}
        <div className="bg-[#001232] text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFB902] text-[#001232] flex items-center justify-center font-bold shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Change Password</h3>
                <p className="text-xs text-slate-300 font-medium">Secure Verification via OTP</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 mt-5">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step >= 1 ? "bg-[#FFB902] text-[#001232]" : "bg-slate-700 text-slate-400"
                }`}
              >
                1
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">Current Password</span>
              <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#FFB902]" : "bg-slate-700"}`} />
            </div>

            <div className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step >= 2 ? "bg-[#FFB902] text-[#001232]" : "bg-slate-700 text-slate-400"
                }`}
              >
                2
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">OTP & New Password</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* Success Flash Message */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{successMessage}</p>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 1: CURRENT PASSWORD & OTP REQUEST */}
          {/* ==================================================== */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600 text-xs leading-relaxed">
                <p className="font-semibold text-[#001232] mb-1">Two-Factor Security Step</p>
                To change your password, please enter your <strong>Current Password</strong>. We will send a 6-digit
                verification code (OTP) to your registered email to authorize this request.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#001232] mb-1.5">Current (Old) Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232] pr-11 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !currentPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#001232] hover:bg-[#001232]/90 text-[#FFB902] font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying & Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* STEP 2: ENTER OTP & NEW PASSWORD */}
          {/* ==================================================== */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndChange} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
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
                  Edit Current Pass
                </button>
              </div>

              {/* 6-Digit OTP Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#001232]">6-Digit Verification Code</label>
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
                  className="w-full text-center text-2xl font-mono font-extrabold tracking-[0.5em] py-3 bg-slate-50 border border-gray-200 rounded-xl text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232] transition-all"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-[#001232] focus:outline-none focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232] pr-11 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
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
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-[#001232] focus:outline-none pr-11 transition-all ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
                        : "border-gray-200 focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#001232] hover:bg-[#001232]/90 text-[#FFB902] font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
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
          {/* STEP 3: SUCCESS ANIMATION */}
          {/* ==================================================== */}
          {step === 3 && (
            <div className="py-8 text-center flex flex-col items-center animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-extrabold text-[#001232]">Password Changed!</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1.5 mb-6 leading-relaxed">
                Your password has been securely updated. A confirmation email has been sent to your inbox.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#001232] text-[#FFB902] font-bold text-xs shadow-md hover:bg-[#001232]/90 transition-colors"
              >
                Close & Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
