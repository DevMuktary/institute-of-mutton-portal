"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LogOut, User, CheckCircle2, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, ArrowRight, Info, ChevronDown, X, Users,
  ShieldCheck, LayoutDashboard, Activity
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

  // Fetch basic user data to verify they are staff
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/dashboard"); 
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        
        // Security check: Only Teachers and Admins belong here
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
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-[#001232] rounded-full animate-spin mb-4"></div>
        <p className="text-[#001232] font-semibold animate-pulse">Initializing Environment...</p>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col w-full overflow-x-hidden font-sans relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Admin Dark Navigation Bar */}
      <nav className="w-full bg-[#001232] border-b border-[#001b45] shadow-lg sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 shrink-0">
                <Image src="/mutoon-logo.png" alt="Logo" width={28} height={28} className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-[16px] sm:text-lg tracking-tight leading-none">Institute of Mutoon</span>
                <span className="text-xs font-bold text-[#FFB902] uppercase tracking-widest mt-1 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Staff Portal
                </span>
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-white leading-tight">{userData.fullName}</span>
                  <span className="text-xs font-semibold text-[#FFB902] capitalize">{userData.role.toLowerCase()}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
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

      {/* Admin Command Center Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Command Center</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001232] tracking-tight">
                Welcome back, {userData.fullName.split(" ")[0]}
              </h1>
              <p className="text-gray-500 mt-2 text-[15px] font-medium max-w-2xl">
                Manage academic operations, update daily matrix records, and oversee administrative workflows from this secure environment.
              </p>
            </div>
            
            {/* System Status Pill */}
            <div className="flex items-center bg-[#F8FAFC] border border-gray-200 rounded-lg px-4 py-3 shrink-0">
              <div className="relative flex h-3 w-3 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase">System Status</span>
                <span className="text-sm font-bold text-[#001232]">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Module Grid */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Daily Marks Module (Active - Enterprise Style) */}
          <div 
            onClick={() => router.push(`/teacher/marks`)}
            className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-200 border-l-[6px] border-l-[#FFB902] cursor-pointer transition-all duration-200 overflow-hidden flex flex-col h-full"
          >
            <div className="p-6 sm:p-8 flex-grow flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-xl bg-[#F8FAFC] border border-gray-100 flex items-center justify-center text-[#001232] group-hover:scale-110 transition-transform duration-300">
                  <CalendarDays className="w-7 h-7" />
                </div>
                <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Active Module
                </span>
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#001232] mb-3">Daily Marks Matrix</h3>
              <p className="text-gray-500 text-[15px] leading-relaxed flex-grow">
                Access the academic register. Input, edit, and review the daily memorization and recitation scores for enrolled students across all active programs.
              </p>
              
              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
                <span className="font-bold text-[#001232] group-hover:text-[#FFB902] transition-colors">Launch Application</span>
                <div className="w-8 h-8 rounded-full bg-[#001232] text-white flex items-center justify-center group-hover:bg-[#FFB902] transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Registrations Module (Locked - Admin Style) */}
          <div 
            onClick={() => showComingSoon("Admissions")}
            className="group relative bg-gray-50 rounded-xl border border-gray-200 cursor-not-allowed flex flex-col h-full"
          >
            <div className="absolute top-6 right-6">
              <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col opacity-60 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 mb-6">
                <Users className="w-7 h-7" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#001232] mb-3">Admissions & Roster</h3>
              <p className="text-gray-500 text-[15px] leading-relaxed flex-grow">
                Review pending applications, approve new student enrollments, and manage the master roster for all academic programs.
              </p>
              
              <div className="mt-8 flex items-center text-gray-400 font-bold border-t border-gray-200 pt-5">
                <Activity className="w-4 h-4 mr-2" /> Pending Integration
              </div>
            </div>
          </div>

          {/* 3. Examinations Module (Locked - Admin Style) */}
          <div 
            onClick={() => showComingSoon("Examinations")}
            className="group relative bg-gray-50 rounded-xl border border-gray-200 cursor-not-allowed flex flex-col h-full"
          >
            <div className="absolute top-6 right-6">
              <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col opacity-60 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 mb-6">
                <GraduationCap className="w-7 h-7" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#001232] mb-3">Examination Center</h3>
              <p className="text-gray-500 text-[15px] leading-relaxed flex-grow">
                Configure exam parameters, log final assessment scores, and calculate term grading percentages.
              </p>
              
              <div className="mt-8 flex items-center text-gray-400 font-bold border-t border-gray-200 pt-5">
                <Activity className="w-4 h-4 mr-2" /> Pending Integration
              </div>
            </div>
          </div>

          {/* 4. Final Results Module (Locked - Admin Style) */}
          <div 
            onClick={() => showComingSoon("Final Results")}
            className="group relative bg-gray-50 rounded-xl border border-gray-200 cursor-not-allowed flex flex-col h-full"
          >
            <div className="absolute top-6 right-6">
              <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-grow flex flex-col opacity-60 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 mb-6">
                <Award className="w-7 h-7" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#001232] mb-3">Certification & Results</h3>
              <p className="text-gray-500 text-[15px] leading-relaxed flex-grow">
                Generate official final results, compile term performance data, and issue digital certificates to passing students.
              </p>
              
              <div className="mt-8 flex items-center text-gray-400 font-bold border-t border-gray-200 pt-5">
                <Activity className="w-4 h-4 mr-2" /> Pending Integration
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="w-full py-6 border-t border-gray-200 bg-white text-center shrink-0 mt-auto">
        <p className="text-xs font-semibold text-gray-400">
          Secure Administration Environment &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="text-[#001232] hover:text-[#FFB902] transition-colors ml-1">
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
