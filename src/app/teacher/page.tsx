"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LogOut, User, CheckCircle2, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, ArrowRight, Info, ChevronDown, X, Users, ShieldCheck, FileText
} from "lucide-react";

interface UserData {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

// Custom Toast Component
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" | "info" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    error: { border: "border-red-500", text: "text-red-800", iconText: "text-red-500", icon: AlertCircle },
    success: { border: "border-green-500", text: "text-green-800", iconText: "text-green-500", icon: CheckCircle2 },
    info: { border: "border-blue-500", text: "text-blue-800", iconText: "text-blue-500", icon: Info },
  };
  const currentStyle = styles[type];
  const Icon = currentStyle.icon;

  return (
    <div className="fixed top-24 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-2xl rounded-r-xl p-4 flex items-start w-80 max-w-full ${currentStyle.border}`}>
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-5 w-5 ${currentStyle.iconText}`} />
        </div>
        <div className="ml-3 w-full">
          <p className={`text-sm font-semibold break-words ${currentStyle.text}`}>{message}</p>
        </div>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${currentStyle.iconText} hover:opacity-70 transition-opacity`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function TeacherPortalHub() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  // Fetch basic user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/dashboard"); 
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        
        // Security check
        if (json.data.role !== "TEACHER" && json.data.role !== "ADMIN") {
          router.push("/dashboard"); 
          return;
        }
        
        setUserData(json.data);
      } catch (err) {
        console.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const showComingSoon = (feature: string) => {
    setToastType("info");
    setToastMessage(`${feature} module is coming soon.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full overflow-x-hidden font-sans relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Premium Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                <Image src="/mutoon-logo.png" alt="Logo" width={28} height={28} className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[#001232] text-[16px] sm:text-lg tracking-tight leading-none">Institute of Mutoon</span>
                <span className="text-xs font-bold text-[#FFB902] uppercase tracking-wider mt-0.5">Control Panel</span>
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-[#001232] leading-tight">{userData.fullName}</span>
                  <span className="text-xs font-semibold text-gray-400 capitalize">{userData.role.toLowerCase()}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-[#001232] flex items-center justify-center text-[#FFB902] shadow-md border-2 border-transparent hover:border-[#FFB902] transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                  <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                    <p className="text-sm font-bold text-[#001232] truncate">{userData.fullName}</p>
                    <p className="text-xs font-medium text-gray-500 truncate">{userData.email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center transition-colors">
                    <LogOut className="w-4 h-4 mr-3 text-red-500" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Command Center Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {/* Admin Banner (Highly Distinct from Student Dashboard) */}
        <div className="bg-[#001232] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB902] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-[#FFB902]" />
                <h2 className="text-sm font-bold text-[#FFB902] tracking-widest uppercase">System Operations</h2>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {userData.fullName.split(" ")[0]}
              </h1>
              <p className="text-gray-300 mt-2 text-sm sm:text-base font-medium max-w-xl">
                Manage academic records, track program progress, and oversee administrative duties from your secure dashboard.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 rounded-xl shrink-0">
              <p className="text-xs text-gray-400 font-semibold mb-0.5">Clearance Level</p>
              <p className="font-bold text-white tracking-wide">{userData.role}</p>
            </div>
          </div>
        </div>

        {/* Split Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Primary Action (Takes 2/3 of space) */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-[#001232] flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span> 
              Active Management Tools
            </h3>

            {/* Daily Marks Module - Wide & Compact Row */}
            <div 
              onClick={() => router.push(`/teacher/marks`)}
              className="group bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-6 cursor-pointer hover:border-[#001232] hover:shadow-lg transition-all duration-300"
            >
              <div className="w-16 h-16 shrink-0 bg-[#F8FAFC] rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-[#001232] transition-colors duration-300">
                <CalendarDays className="w-8 h-8 text-[#001232] group-hover:text-[#FFB902] transition-colors duration-300" />
              </div>
              
              <div className="flex-grow">
                <h4 className="text-xl font-extrabold text-[#001232] mb-1">Daily Marks Entry</h4>
                <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                  Select a program, view your active student roster, and securely log daily memorization scores into the system.
                </p>
              </div>

              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-[#FFB902] group-hover:border-[#FFB902] transition-all duration-300">
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#001232] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Secondary / Locked Modules (Takes 1/3 of space) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-400 flex items-center">
              <Lock className="w-4 h-4 mr-3" /> Upcoming Features
            </h3>

            <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2 shadow-sm">
              
              {/* Admissions Item */}
              <div 
                onClick={() => showComingSoon("Admissions")}
                className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-not-allowed transition-colors"
              >
                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mr-4 shrink-0">
                  <Users className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-grow">
                  <h5 className="text-sm font-bold text-gray-400">Admissions Processing</h5>
                  <p className="text-[13px] text-gray-400 mt-0.5">Review pending applications.</p>
                </div>
              </div>

              {/* Examinations Item */}
              <div 
                onClick={() => showComingSoon("Examinations")}
                className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-not-allowed transition-colors"
              >
                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mr-4 shrink-0">
                  <GraduationCap className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-grow">
                  <h5 className="text-sm font-bold text-gray-400">Examination Logs</h5>
                  <p className="text-[13px] text-gray-400 mt-0.5">Schedule & record assessments.</p>
                </div>
              </div>

              {/* Final Results Item */}
              <div 
                onClick={() => showComingSoon("Final Results")}
                className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-not-allowed transition-colors"
              >
                <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mr-4 shrink-0">
                  <FileText className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-grow">
                  <h5 className="text-sm font-bold text-gray-400">Final Results Generator</h5>
                  <p className="text-[13px] text-gray-400 mt-0.5">Compile certificates & rankings.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <footer className="w-full py-8 border-t border-gray-200 bg-white text-center shrink-0 mt-auto">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-bold text-[#001232] hover:text-[#FFB902] transition-colors">
            Quadrox Technologies Limited
          </a>
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}
