"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// Custom Toast Component
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type === "error";

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-lg rounded-r-lg p-4 flex items-start w-80 max-w-full ${isError ? 'border-red-500' : 'border-green-500'}`}>
        <div className="flex-shrink-0">
          {isError ? (
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 w-full">
          <p className={`text-sm font-semibold break-words ${isError ? 'text-red-800' : 'text-green-800'}`}>{message}</p>
        </div>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${isError ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success">("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setToastMessage("");

    if (password.length < 6) {
      setToastType("error");
      setToastMessage("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setToastType("error");
      setToastMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass the token from the URL (if it exists) to the API route
        body: JSON.stringify({ password, token: urlToken })
      });

      const data = await response.json();

      if (!response.ok) {
        setToastType("error");
        setToastMessage(data.error || "Failed to update password.");
        setIsLoading(false);
      } else {
        setToastType("success");
        setToastMessage("Password updated securely! Redirecting...");
        
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err) {
      setToastType("error");
      setToastMessage("Network error. Please check your connection.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col w-full overflow-x-hidden relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}
      
      {/* Header */}
      <div className="w-full bg-[#001232] px-4 pt-12 pb-24 flex flex-col items-center text-center shrink-0">
        <h1 className="text-3xl font-bold text-white tracking-tight">Institute of Mutoon</h1>
        <p className="text-[#FFB902] mt-2 text-sm font-semibold uppercase tracking-wider">Account Security</p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-xl mx-auto px-4 sm:px-8 -mt-12 z-10 relative bg-white rounded-t-3xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-gray-100 mb-12 flex-grow">
        
        <div className="flex flex-col items-center -mt-10 mb-8">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center border border-gray-100 mb-6">
            <Image src="/mutoon-logo.png" alt="Institute of Mutoon Logo" width={80} height={80} className="object-contain" priority />
          </div>
          <div className="w-full text-center px-4">
            <h2 className="text-2xl font-bold text-[#001232]">Set Your Password</h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              For your security, you must choose a new, private password before accessing your dashboard.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-8 px-2 sm:px-6">
          <div className="min-w-0 relative">
            <label className="block text-sm font-semibold text-[#001232] mb-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none text-[16px] text-[#001232] pr-12"
                placeholder="••••••••" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="min-w-0 relative">
            <label className="block text-sm font-semibold text-[#001232] mb-1">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full min-w-0 px-4 py-3 border rounded-lg focus:ring-2 outline-none text-[16px] text-[#001232] pr-12 transition-colors ${
                  confirmPassword && password !== confirmPassword 
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                    : "border-gray-300 focus:border-[#FFB902] focus:ring-[#FFB902]"
                }`}
                placeholder="••••••••" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-500 text-xs mt-1 font-medium">Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={isLoading || (confirmPassword !== "" && password !== confirmPassword)}
            className="w-full bg-[#001232] text-white font-bold py-4 px-4 rounded-lg hover:bg-[#001232]/90 transition-all focus:ring-4 focus:ring-[#001232]/20 mt-2 text-[16px] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center shadow-md hover:shadow-lg">
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Save & Access Dashboard"}
          </button>
          
          <div className="pt-4 text-center text-sm font-medium text-gray-500">
            <Link href="/login" className="text-gray-400 hover:text-[#001232] transition-colors">
              Return to Login
            </Link>
          </div>
        </form>
      </div>

      {/* Quadrox Footer */}
      <footer className="w-full py-6 mt-auto border-t border-gray-100 text-center shrink-0">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#001232] hover:text-[#FFB902] transition-colors">
            Quadrox Technologies Limited
          </a>
        </p>
      </footer>

      {/* Tailwind animation configuration for the toast slide-in */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
