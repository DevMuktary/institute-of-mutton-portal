"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, LogOut, User, Clock, CheckCircle2, AlertCircle, 
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

// Custom Toast Component - Fixed positioning to clear the navbar
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
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(true); // Modal state
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  // Fetch Dashboard Data
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

  // Handle clicking outside the profile dropdown to close it
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
    setIsProfileOpen(false); // Close dropdown if open
    setToastType("info");
    setToastMessage(`${feature} feature is coming soon.`);
  };

  const navigateToMarks = () => {
    if (!activeEnrollment) return;
    router.push(`/dashboard/${activeEnrollment.id}/marks`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin mb-4"></div>
        <p className="text-[#001232] font-semibold text-[16px]">Loading your dashboard...</p>
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
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-lg w-full relative shadow-2xl animate-fade-in-down text-center">
            <button 
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-sm">
              <Image src="/mutoon-logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001232] mb-3 tracking-tight">
              Assalamu Alaykum, {userData.fullName.split(" ")[0]}!
            </h2>
            <p className="text-gray-500 text-[16px] leading-relaxed mb-8">
              Welcome to your student portal. You can now securely track your memorization progress, daily marks, and examination results all in one place.
            </p>
            <button 
              onClick={() => setShowWelcomeModal(false)}
              className="w-full bg-[#001232] text-white font-bold py-4 rounded-xl hover:bg-[#001232]/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Premium Top Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Area */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5">
                <Image src="/mutoon-logo.png" alt="Logo" width={40} height={40} className="object-contain" priority />
              </div>
              <span className="font-extrabold text-[#001232] text-xl hidden sm:block tracking-tight">
                Institute of Mutton
              </span>
            </div>
            
            {/* Profile Dropdown Area */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
              >
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-[#001232] leading-tight">{userData.fullName}</span>
                  <span className="text-xs font-semibold text-gray-400">Student</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#001232] to-[#002868] flex items-center justify-center text-white shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                  <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                    <p className="text-sm font-bold text-[#001232] truncate">{userData.fullName}</p>
                    <p className="text-xs font-medium text-gray-500 truncate">{userData.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => showComingSoon("Profile Management")}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#001232] flex items-center transition-colors"
                  >
                    <User className="w-4 h-4 mr-3 text-gray-400" /> My Profile
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3 text-red-500" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {userData.enrollments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-lg mt-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-[#001232] mb-3">No Active Enrollments</h3>
            <p className="text-gray-500 mb-8 max-w-md text-[16px] leading-relaxed">
              You haven't enrolled in any memorization programs yet. Browse our open programs to begin your journey.
            </p>
            <Link href="/" className="bg-[#FFB902] text-[#001232] px-8 py-4 rounded-xl font-bold hover:bg-[#e0a200] transition-colors shadow-md">
              Browse Programs
            </Link>
          </div>
        ) : (
          <div className="flex flex-col space-y-6 min-w-0">
            
            {/* Program Switcher Tabs */}
            <div className="w-full min-w-0">
              <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0">
                {userData.enrollments.map((enrollment) => (
                  <button
                    key={enrollment.id}
                    onClick={() => setActiveEnrollment(enrollment)}
                    className={`whitespace-nowrap flex items-center px-6 py-3.5 rounded-xl text-[16px] font-bold transition-all shrink-0 border-2 ${
                      activeEnrollment?.id === enrollment.id
                        ? "bg-[#001232] text-[#FFB902] border-[#001232] shadow-lg transform -translate-y-0.5"
                        : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:text-[#001232]"
                    }`}
                  >
                    <BookOpen className={`w-5 h-5 mr-2.5 ${activeEnrollment?.id === enrollment.id ? "text-[#FFB902]" : "text-gray-400"}`} />
                    {enrollment.program.titleEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Program Canvas */}
            {activeEnrollment && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full flex flex-col min-w-0">
                
                {/* Canvas Header (Cleaned up: No Max Score) */}
                <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 bg-white">
                  <div className="min-w-0 flex-grow">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001232] truncate tracking-tight">
                      {activeEnrollment.program.titleEn}
                    </h2>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="shrink-0">
                    {activeEnrollment.approvalStatus === "APPROVED" && (
                      <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" /> Approved & Active
                      </span>
                    )}
                    {activeEnrollment.approvalStatus === "PENDING" && (
                      <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                        <Clock className="w-5 h-5 mr-2 text-amber-500" /> Pending Approval
                      </span>
                    )}
                    {activeEnrollment.approvalStatus === "REJECTED" && (
                      <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                        <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Application Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Canvas Body */}
                <div className="p-6 sm:p-8 flex-grow bg-gray-50/30">
                  {activeEnrollment.approvalStatus === "PENDING" ? (
                    <div className="text-center py-16 flex flex-col items-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                        <Clock className="w-10 h-10 text-amber-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#001232] mb-3">Under Administrative Review</h3>
                      <p className="text-gray-500 max-w-md text-[16px] leading-relaxed">
                        Your application for this program is currently being reviewed by our team. 
                        You will receive an email once your portal access is fully unlocked.
                      </p>
                    </div>
                  ) : activeEnrollment.approvalStatus === "APPROVED" ? (
                    
                    /* The 3-Card Interactive Grid */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                      
                      {/* Active: Daily Marks */}
                      <div 
                        onClick={navigateToMarks}
                        className="group bg-white border border-gray-200 rounded-2xl p-8 hover:border-[#FFB902] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="w-14 h-14 bg-[#001232]/5 text-[#001232] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#001232] group-hover:text-[#FFB902] transition-all duration-300">
                          <CalendarDays className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-extrabold text-[#001232] mb-3">Daily Marks</h3>
                        <p className="text-gray-500 text-[15px] leading-relaxed flex-grow">
                          Track your everyday memorization progress, attendance, and performance (scored out of {activeEnrollment.program.maxDailyMark}) logged by your teacher.
                        </p>
                        <div className="mt-8 flex items-center text-[#001232] font-bold text-[16px] group-hover:text-[#FFB902] transition-colors">
                          View Marks <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                      </div>

                      {/* Locked: Examinations */}
                      <div 
                        onClick={() => showComingSoon("Examinations")}
                        className="bg-white border border-gray-100 rounded-2xl p-8 cursor-not-allowed flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-shadow"
                      >
                        <div className="absolute top-5 right-5 bg-gray-50 p-2 rounded-full border border-gray-100">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center mb-6 border border-gray-100">
                          <GraduationCap className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-400 mb-3">Examinations</h3>
                        <p className="text-gray-400 text-[15px] leading-relaxed flex-grow">
                          View your periodic examination scores and detailed feedback.
                        </p>
                      </div>

                      {/* Locked: Final Result */}
                      <div 
                        onClick={() => showComingSoon("Final Results")}
                        className="bg-white border border-gray-100 rounded-2xl p-8 cursor-not-allowed flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-shadow"
                      >
                        <div className="absolute top-5 right-5 bg-gray-50 p-2 rounded-full border border-gray-100">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center mb-6 border border-gray-100">
                          <Award className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-400 mb-3">Final Result</h3>
                        <p className="text-gray-400 text-[15px] leading-relaxed flex-grow">
                          Access your overall program performance, aggregate score, and certification.
                        </p>
                      </div>

                    </div>

                  ) : null}
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-gray-200 bg-white text-center shrink-0 mt-auto">
        <p className="text-sm font-medium text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-bold text-[#001232] hover:text-[#FFB902] transition-colors">
            Quadrox Technologies Limited
          </a>
        </p>
      </footer>

      {/* Tailwind animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.2s ease-out forwards;
        }
      `}} />
    </div>
  );
}