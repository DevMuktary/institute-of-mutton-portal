"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LogOut, User, CheckCircle2, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, Info, ChevronDown, X, Users, ChevronRight
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
    <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-3 flex items-start w-80 max-w-full ${currentStyle.border}`}>
        <div className="flex-shrink-0 mt-0.5"><Icon className={`h-4 w-4 ${currentStyle.iconText}`} /></div>
        <div className="ml-3 w-full"><p className={`text-sm font-semibold break-words ${currentStyle.text}`}>{message}</p></div>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${currentStyle.iconText} hover:opacity-70`}><X className="h-4 w-4" /></button>
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/dashboard"); 
        if (!res.ok) return router.push("/login");
        const json = await res.json();
        
        if (json.data.role !== "TEACHER" && json.data.role !== "ADMIN") {
          return router.push("/dashboard"); 
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
    setToastMessage(`${feature} module is currently locked.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Compact Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Image src="/mutoon-logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
            <span className="font-extrabold text-[#001232] text-lg leading-none">Mutoon Admin</span>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 focus:outline-none hover:opacity-80 transition-opacity">
              <div className="hidden sm:block text-right mr-1">
                <div className="text-sm font-bold text-[#001232] leading-tight">{userData.fullName.split(" ")[0]}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">{userData.role}</div>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#001232] flex items-center justify-center text-[#FFB902]">
                <User className="w-4 h-4" />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center">
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col">
        
        {/* Simple Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#001232]">Control Panel</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage portal operations</p>
        </div>

        {/* Compact List Menu */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
          
          {/* Daily Marks (Active) */}
          <div 
            onClick={() => router.push(`/teacher/marks`)}
            className="flex items-center p-4 sm:p-5 hover:bg-[#f8fafc] cursor-pointer transition-colors active:bg-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h3 className="text-[15px] font-bold text-[#001232]">Daily Marks Entry</h3>
              <p className="text-[13px] text-gray-500 mt-0.5">Record students' memorization</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
          </div>

          {/* Admissions (Locked) */}
          <div 
            onClick={() => showComingSoon("Admissions")}
            className="flex items-center p-4 sm:p-5 hover:bg-[#f8fafc] cursor-pointer transition-colors active:bg-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 border border-gray-100 flex items-center justify-center mr-4 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h3 className="text-[15px] font-bold text-gray-700">Admissions</h3>
              <p className="text-[13px] text-gray-400 mt-0.5">Review student applications</p>
            </div>
            <Lock className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
          </div>

          {/* Examinations (Locked) */}
          <div 
            onClick={() => showComingSoon("Examinations")}
            className="flex items-center p-4 sm:p-5 hover:bg-[#f8fafc] cursor-pointer transition-colors active:bg-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 border border-gray-100 flex items-center justify-center mr-4 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h3 className="text-[15px] font-bold text-gray-700">Examinations</h3>
              <p className="text-[13px] text-gray-400 mt-0.5">Schedule & record assessments</p>
            </div>
            <Lock className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
          </div>

          {/* Final Results (Locked) */}
          <div 
            onClick={() => showComingSoon("Final Results")}
            className="flex items-center p-4 sm:p-5 hover:bg-[#f8fafc] cursor-pointer transition-colors active:bg-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 border border-gray-100 flex items-center justify-center mr-4 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h3 className="text-[15px] font-bold text-gray-700">Final Results</h3>
              <p className="text-[13px] text-gray-400 mt-0.5">Generate certificates</p>
            </div>
            <Lock className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
          </div>

        </div>
      </main>

      <footer className="w-full py-6 text-center shrink-0 mt-auto">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()} Quadrox Technologies
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}
