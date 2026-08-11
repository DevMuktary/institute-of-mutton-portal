"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, Lock, AlertCircle, ArrowLeft } from "lucide-react";

// --- Custom Toast Component ---
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" | "info" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-4 flex items-start w-80 max-w-full ${type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className={`h-5 w-5 ${type === 'error' ? 'text-red-500' : 'text-green-500'}`} />
        </div>
        <div className="ml-3 w-full">
          <p className={`text-sm font-semibold break-words ${type === 'error' ? 'text-red-800' : 'text-green-800'}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default function TeacherLoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success">("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setToastMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToastType("error");
        setToastMessage(data.error || "Authentication failed. Check your credentials.");
        setIsLoading(false);
        return;
      }

      setToastType("success");
      setToastMessage("Authentication successful. Initializing secure session...");

      // Wait a moment for the cookie to set and the toast to show
      setTimeout(() => {
        // If the API flags that they need to reset their password, send them there
        if (data.mustResetPass) {
          router.push("/reset-password");
        } else {
          // Send them straight to the Teacher Control Panel!
          router.push("/teacher");
        }
      }, 1000);

    } catch (err) {
      setToastType("error");
      setToastMessage("Network error. Could not reach authentication server.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Left Side - Branding & Security Panel */}
      <div className="hidden md:flex md:w-1/2 bg-[#001232] relative flex-col justify-between p-12 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#FFB902] opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center p-3 mb-8">
            <Image src="/mutoon-logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Staff Access<br />Control.
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Secure authentication portal for Institute of Mutoon administrators and teaching staff.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 text-[#FFB902]">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-bold tracking-widest uppercase text-sm">Restricted Area</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-12 lg:p-24 relative bg-white">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex flex-col items-center text-center mb-10 mt-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center p-3 mb-4">
            <Image src="/mutoon-logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <h2 className="text-2xl font-extrabold text-[#001232]">Staff Access</h2>
          <div className="flex items-center justify-center space-x-2 text-[#FFB902] mt-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold tracking-widest uppercase text-[10px]">Restricted Area</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-extrabold text-[#001232] hidden md:block mb-2">Sign In</h2>
          <p className="text-gray-500 font-medium hidden md:block mb-8">Enter your staff credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-[#001232] mb-2">Staff Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#001232] focus:border-[#001232] outline-none transition-all text-[#001232] font-medium"
                  placeholder="admin@mutoon.edu" 
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-[#001232]">Password</label>
                <Link href="/forgot-password" className="text-sm font-bold text-gray-400 hover:text-[#001232] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#001232] focus:border-[#001232] outline-none transition-all text-[#001232] font-medium"
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#001232] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !email || !password}
              className="w-full bg-[#001232] text-white font-bold py-4 rounded-xl hover:bg-[#001232]/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Authenticate"}
            </button>

          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center">
            <Link href="/" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-[#001232] transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Public Site
            </Link>
          </div>
          
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}
