"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LogOut, User, CheckCircle2, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, ArrowRight, Info, ChevronDown, X, Users
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

  // Fetch basic user data to verify they are staff and get their name
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/dashboard"); // We can reuse the dashboard API for profile info
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        
        // Security check: Only Teachers and Admins belong here
        if (json.data.role !== "TEACHER" && json.data.role !== "ADMIN") {
          router.push("/dashboard"); // Kick students back to the student portal
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                <Image src="/mutoon-logo.png" alt="Logo" width={28} height={28} className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[#001232] text-[16px] sm:text-lg tracking-tight leading-none">Institute of Mutoon</span>
                <span className="text-xs font-bold text-[#FFB902] uppercase tracking-wider mt-0.5">Staff Portal</span>
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-[#001232] leading-tight">{userData.fullName}</span>
                  <span className="text-xs font-semibold text-gray-400 capitalize">{userData.role.toLowerCase()}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-[#001232] flex items-center justify-center text-[#FFB902] shadow-md">
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
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {/* Hub Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001232] tracking-tight truncate">
              Welcome, {userData.fullName.split(" ")[0]}
            </h1>
            <p className="text-gray-500 mt-2 text-[15px] font-medium">Select a management module below to begin.</p>
          </div>
        </div>

        {/* 4-Card Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* 1. Daily Marks Module (Active) */}
          <div 
            onClick={() => router.push(`/teacher/marks`)}
            className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-br from-[#001232] to-[#001b45] border border-[#001232] flex flex-col h-full lg:col-span-2"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFB902] opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/4 pointer-events-none"></div>
            
            <div className="w-12 h-12 rounded-xl bg-[#FFB902]/20 text-[#FFB902] flex items-center justify-center mb-4 relative z-10 border border-[#FFB902]/20 group-hover:scale-110 transition-transform duration-300">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2 relative z-10">Daily Marks Entry</h3>
            <p className="text-gray-300 text-[14px] leading-relaxed flex-grow relative z-10">
              Select a program, view your student roster, and log daily memorization scores.
            </p>
            <div className="mt-6 flex items-center text-[#FFB902] font-bold text-[14px] relative z-10">
              Open Module <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>

          {/* 2. Registrations Module (Locked) */}
          <div 
            onClick={() => showComingSoon("Admissions")}
            className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 cursor-not-allowed bg-white border border-gray-200 transition-all hover:border-gray-300 hover:shadow-md flex flex-col h-full lg:col-span-2"
          >
            <div className="absolute top-5 right-5">
              <div className="bg-gray-50 p-1.5 rounded-full border border-gray-100">
                <Lock className="w-3.5 h-3.5 text-gray-300" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mb-4 border border-gray-100">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-[#001232] opacity-50 mb-2">Admissions</h3>
            <p className="text-gray-400 text-[14px] leading-relaxed flex-grow">
              Review, approve, or reject new student program applications.
            </p>
          </div>

          {/* 3. Examinations Module (Locked) */}
          <div 
            onClick={() => showComingSoon("Examinations")}
            className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 cursor-not-allowed bg-white border border-gray-200 transition-all hover:border-gray-300 hover:shadow-md flex flex-col h-full lg:col-span-2"
          >
            <div className="absolute top-5 right-5">
              <div className="bg-gray-50 p-1.5 rounded-full border border-gray-100">
                <Lock className="w-3.5 h-3.5 text-gray-300" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mb-4 border border-gray-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-[#001232] opacity-50 mb-2">Examinations</h3>
            <p className="text-gray-400 text-[14px] leading-relaxed flex-grow">
              Schedule exams and log periodic assessment scores.
            </p>
          </div>

          {/* 4. Final Results Module (Locked) */}
          <div 
            onClick={() => showComingSoon("Final Results")}
            className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6 cursor-not-allowed bg-white border border-gray-200 transition-all hover:border-gray-300 hover:shadow-md flex flex-col h-full lg:col-span-2"
          >
            <div className="absolute top-5 right-5">
              <div className="bg-gray-50 p-1.5 rounded-full border border-gray-100">
                <Lock className="w-3.5 h-3.5 text-gray-300" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mb-4 border border-gray-100">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-[#001232] opacity-50 mb-2">Final Results</h3>
            <p className="text-gray-400 text-[14px] leading-relaxed flex-grow">
              Generate final certificates and view aggregate student scores.
            </p>
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