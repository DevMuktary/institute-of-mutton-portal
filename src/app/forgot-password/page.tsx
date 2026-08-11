"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      // We always show success to prevent email enumeration attacks
      setIsSuccess(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col w-full">
      <div className="w-full bg-[#001232] px-4 pt-12 pb-24 flex flex-col items-center text-center shrink-0">
        <h1 className="text-3xl font-bold text-white tracking-tight">Institute of Mutoon</h1>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 sm:px-8 -mt-12 z-10 relative bg-white rounded-3xl sm:shadow-2xl sm:border sm:border-gray-100 mb-12">
        <div className="flex flex-col items-center -mt-10 mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center border border-gray-100 mb-4">
            <Image src="/mutoon-logo.png" alt="Logo" width={60} height={60} priority />
          </div>
          <h2 className="text-2xl font-bold text-[#001232]">Reset Password</h2>
        </div>

        {isSuccess ? (
          <div className="text-center pb-10">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#001232] mb-2">Check Your Email</h3>
            <p className="text-gray-500 text-sm mb-6">
              If an account exists for <strong>{email}</strong>, we have sent a password reset link. Please check your inbox and spam folder.
            </p>
            <Link href="/login" className="text-[#001232] font-bold hover:underline">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pb-8">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold">{error}</div>}
            
            <div>
              <label className="block text-sm font-semibold text-[#001232] mb-1">Email Address</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] outline-none text-[#001232]"
                placeholder="Enter your registered email" 
              />
            </div>

            <button type="submit" disabled={isLoading || !email}
              className="w-full bg-[#001232] text-white font-bold py-3.5 rounded-lg hover:bg-[#001232]/90 transition-all disabled:opacity-70 shadow-md">
              {isLoading ? "Sending Link..." : "Send Reset Link"}
            </button>
            
            <div className="text-center pt-2">
              <Link href="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#001232] transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
