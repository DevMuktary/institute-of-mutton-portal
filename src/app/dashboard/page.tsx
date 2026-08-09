"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, LogOut, User, Clock, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, ArrowRight, Info, ChevronDown, X
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  slug: string;
  maxDailyMark: number;
}

interface Enrollment {
  id: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  program: Program;
}

interface UserData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  enrollments: Enrollment[];
}

// Custom Toast Component
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" | "info" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    error: { border: "border-red-500", text: "text-red-800", iconText: "text-red-500" },
    success: { border: "border-green-500", text: "text-green-800", iconText: "text-green-500" },
    info: { border: "border-blue-500", text: "text-blue-800", iconText: "text-blue-500" },
  };
  const currentStyle = styles[type];

  return (
    <div className="fixed top-24 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-2xl rounded-r-xl p-4 flex items-start w-80 max-w-full ${currentStyle.border}`}>
        <div className="flex-shrink-0 mt-0.5">
          {type === 'info' ? <Info className={`h-5 w-5 ${currentStyle.iconText}`} /> : <AlertCircle className={`h-5 w-5 ${currentStyle.iconText}`} />}
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

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeEnrollment, setActiveEnrollment] = useState<Enrollment | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          return;
        }
        const json = await res.json();
        setUserData(json.data);
        if (json.data.enrollments && json.data.enrollments.length > 0) {
          setActiveEnrollment(json.data.enrollments[0]);
        }
      } catch (err) {
        console.error("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
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
    setIsProfileOpen(false);
    setToastType("info");
    setToastMessage(`${feature} feature is coming soon.`);
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

      {/* Welcome Modal Overlay */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[9999] bg-[#001232]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full relative shadow-2xl animate-fade-in-down text-center border border-gray-100">
            <button onClick={() => setShowWelcomeModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            {/* Branding integrated smoothly */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm mb-3">
                <Image src="/mutoon-logo.png" alt="Logo" width={40} height={40} className="object-contain" priority />
              </div>
              <h1 className="text-sm font-bold text-[#001232] uppercase tracking-widest">Institute of Mutoon</h1>
            </div>

            <h2 className="text-2xl font-extrabold text-[#001232] mb-3 tracking-tight">
              Welcome, {userData.fullName.split(" ")[0]}!
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
              Access your memorization progress, daily marks, and examination results from your new dashboard.
            </p>
            <button onClick={() => setShowWelcomeModal(false)} className="w-full bg-[#001232] text-white font-bold py-3.5 rounded-xl hover:bg-[#001232]/90 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 duration-200">
              Proceed to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Premium Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5">
                <Image src="/mutoon-logo.png" alt="Logo" width={32} height={32} className="object-contain" priority />
              </div>
              <span className="font-extrabold text-[#001232] text-lg hidden sm:block tracking-tight">Institute of Mutoon</span>
            </div>
            
            {/* Unified Profile & Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-[#001232] leading-tight">{userData.fullName}</span>
                  <span className="text-xs font-semibold text-gray-400">Student</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-[#001232] flex items-center justify-center text-[#FFB902] shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-fade-in-down">
                  <div className="px-5 py-2 sm:hidden">
                    <p className="text-sm font-bold text-[#001232] truncate">{userData.fullName}</p>
                    <p className="text-xs font-medium text-gray-500 truncate">{userData.email}</p>
                  </div>
                  
                  {/* Program Switcher Section */}
                  {userData.enrollments.length > 0 && (
                    <>
                      <div className="px-5 mt-2 mb-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your Programs</p>
                      </div>
                      <div className="px-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {userData.enrollments.map((enr) => (
                          <button 
                            key={enr.id}
                            onClick={() => { setActiveEnrollment(enr); setIsProfileOpen(false); }}
                            className={`w-full text-left flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 ${activeEnrollment?.id === enr.id ? 'bg-[#001232] text-[#FFB902]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#001232]'}`}
                          >
                            <BookOpen className={`w-4 h-4 mr-3 shrink-0 ${activeEnrollment?.id === enr.id ? 'text-[#FFB902]' : 'text-gray-400'}`} />
                            <span className="truncate">{enr.program.titleEn}</span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 my-2 mx-4"></div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="px-2">
                    <button onClick={() => showComingSoon("Profile Management")} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#001232] rounded-xl flex items-center transition-colors">
                      <User className="w-4 h-4 mr-3 text-gray-400" /> My Profile
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center transition-colors mt-1">
                      <LogOut className="w-4 h-4 mr-3 text-red-500" /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {!activeEnrollment ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm mt-4">
            <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-[#001232] mb-2">No Active Programs</h3>
            <p className="text-gray-500 mb-6 text-sm">You haven't enrolled in any memorization programs yet.</p>
            <Link href="/" className="bg-[#001232] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#001232]/90 transition-colors shadow-sm">
              Browse Programs
            </Link>
          </div>
        ) : (
          <div className="flex flex-col min-w-0">
            
            {/* Program Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001232] tracking-tight truncate">
                  {activeEnrollment.program.titleEn}
                </h1>
                <p className="text-gray-500 mt-2 text-[15px] font-medium">Student Dashboard</p>
              </div>
              
              <div className="shrink-0">
                {activeEnrollment.approvalStatus === "APPROVED" && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Approved</span>
                  </div>
                )}
                {activeEnrollment.approvalStatus === "PENDING" && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <Clock className="w-4 h-4 text-amber-600 stroke-[3]" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            {activeEnrollment.approvalStatus === "PENDING" ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center flex flex-col items-center">
                <Clock className="w-16 h-16 text-amber-400 mb-6" />
                <h3 className="text-2xl font-bold text-[#001232] mb-3">Review in Progress</h3>
                <p className="text-gray-500 text-[16px] max-w-md leading-relaxed">
                  Your application is currently being reviewed. Full dashboard access will unlock once approved.
                </p>
              </div>
            ) : (
              /* Re-imagined Bold, Premium Grid */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                
                {/* 1. Daily Marks Card (Rich Brand Colors, Deep Gradient) */}
                <div 
                  onClick={() => router.push(`/dashboard/${activeEnrollment.id}/marks`)}
                  className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-br from-[#001232] to-[#001b45] border border-[#001232] flex flex-col h-full"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFB902] opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4 pointer-events-none"></div>
                  
                  <div className="w-14 h-14 rounded-2xl bg-[#FFB902]/20 text-[#FFB902] flex items-center justify-center mb-6 relative z-10 border border-[#FFB902]/20 group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-3 relative z-10">Daily Marks</h3>
                  <p className="text-gray-300 text-[15px] leading-relaxed flex-grow relative z-10">
                    Track your everyday memorization progress and performance.
                  </p>
                  <div className="mt-8 flex items-center text-[#FFB902] font-bold text-[16px] relative z-10">
                    View Progress <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>

                {/* 2. Examinations Card (Clean, Frosted Style) */}
                <div 
                  onClick={() => showComingSoon("Examinations")}
                  className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 cursor-not-allowed bg-white border border-gray-200 transition-all hover:border-gray-300 hover:shadow-lg flex flex-col h-full"
                >
                  <div className="absolute top-6 right-6">
                    <div className="bg-gray-50 p-2 rounded-full border border-gray-100">
                      <Lock className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mb-6 border border-gray-100">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-400 mb-3">Examinations</h3>
                  <p className="text-gray-400 text-[15px] leading-relaxed flex-grow">
                    Take your exams and view your assessment results.
                  </p>
                </div>

                {/* 3. Final Result Card (Clean, Frosted Style) */}
                <div 
                  onClick={() => showComingSoon("Final Result")}
                  className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 cursor-not-allowed bg-white border border-gray-200 transition-all hover:border-gray-300 hover:shadow-lg flex flex-col h-full"
                >
                  <div className="absolute top-6 right-6">
                    <div className="bg-gray-50 p-2 rounded-full border border-gray-100">
                      <Lock className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mb-6 border border-gray-100">
                    <Award className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-400 mb-3">Final Result</h3>
                  <p className="text-gray-400 text-[15px] leading-relaxed flex-grow">
                    View your final program results and access your certificate.
                  </p>
                </div>

              </div>
            )}
          </div>
        )}
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}