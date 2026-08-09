"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, LogOut, User, Clock, CheckCircle2, AlertCircle, 
  CalendarDays, GraduationCap, Award, Lock, ArrowRight, Info
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

// Custom Toast Component with Info state added
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
    <div className="fixed top-6 right-6 z-50 animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-lg rounded-r-lg p-4 flex items-start w-80 max-w-full ${currentStyle.border}`}>
        <div className="flex-shrink-0">
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

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const showComingSoon = (feature: string) => {
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

      {/* Top Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center p-1">
                <Image src="/mutoon-logo.png" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
              <span className="font-bold text-[#001232] text-lg hidden sm:block">Institute of Mutton</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <span className="text-sm font-bold text-[#001232]">{userData.fullName}</span>
                <span className="text-xs font-medium text-gray-500">{userData.email}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-[#001232]/10 flex items-center justify-center text-[#001232]">
                <User className="w-5 h-5" />
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {/* Welcome Section */}
        <div className="mb-8 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#001232] truncate">Assalamu Alaykum, {userData.fullName.split(" ")[0]}</h1>
          <p className="text-gray-500 mt-1 text-[16px]">Manage your memorization progress and programs here.</p>
        </div>

        {userData.enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#001232] mb-2">No Active Enrollments</h3>
            <p className="text-gray-500 mb-6 max-w-md">You haven't enrolled in any memorization programs yet. Browse our open programs to begin.</p>
            <Link href="/" className="bg-[#001232] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#001232]/90 transition-colors">
              Browse Programs
            </Link>
          </div>
        ) : (
          <div className="flex flex-col space-y-6 min-w-0">
            
            {/* Program Switcher Tabs */}
            <div className="w-full min-w-0">
              <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Your Programs</p>
              <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0">
                {userData.enrollments.map((enrollment) => (
                  <button
                    key={enrollment.id}
                    onClick={() => setActiveEnrollment(enrollment)}
                    className={`whitespace-nowrap flex items-center px-5 py-3 rounded-full text-[16px] font-semibold transition-all shrink-0 border ${
                      activeEnrollment?.id === enrollment.id
                        ? "bg-[#001232] text-white border-[#001232] shadow-md"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 mr-2 ${activeEnrollment?.id === enrollment.id ? "text-[#FFB902]" : "text-gray-400"}`} />
                    {enrollment.program.titleEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Program Canvas */}
            {activeEnrollment && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full flex flex-col min-w-0">
                
                {/* Canvas Header */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                  <div className="min-w-0 flex-grow">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#001232] truncate">{activeEnrollment.program.titleEn}</h2>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-sm font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-md">
                        Max Daily Score: {activeEnrollment.program.maxDailyMark}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="shrink-0">
                    {activeEnrollment.approvalStatus === "APPROVED" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approved & Active
                      </span>
                    )}
                    {activeEnrollment.approvalStatus === "PENDING" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-4 h-4 mr-1.5" /> Pending Approval
                      </span>
                    )}
                    {activeEnrollment.approvalStatus === "REJECTED" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle className="w-4 h-4 mr-1.5" /> Application Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Canvas Body */}
                <div className="p-6 sm:p-8 flex-grow">
                  {activeEnrollment.approvalStatus === "PENDING" ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-amber-500" />
                      </div>
                      <h3 className="text-lg font-bold text-[#001232] mb-2">Under Administrative Review</h3>
                      <p className="text-gray-500 max-w-md text-[16px]">
                        Your application for this program is currently being reviewed by our team. 
                        You will receive an email once your portal access is fully unlocked.
                      </p>
                    </div>
                  ) : activeEnrollment.approvalStatus === "APPROVED" ? (
                    
                    /* The 3-Card Interactive Grid */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Active: Daily Marks */}
                      <div 
                        onClick={navigateToMarks}
                        className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-[#FFB902] hover:shadow-lg transition-all cursor-pointer flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="w-12 h-12 bg-[#001232]/5 text-[#001232] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <CalendarDays className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-[#001232] mb-2">Daily Marks</h3>
                        <p className="text-gray-500 text-sm flex-grow">Track your everyday memorization progress, attendance, and scores logged by your teacher.</p>
                        <div className="mt-6 flex items-center text-[#FFB902] font-semibold text-sm">
                          View Marks <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Locked: Examinations */}
                      <div 
                        onClick={() => showComingSoon("Examinations")}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-6 cursor-not-allowed flex flex-col h-full relative overflow-hidden group"
                      >
                        <div className="absolute top-4 right-4 bg-white p-1.5 rounded-full shadow-sm">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center mb-4">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-500 mb-2">Examinations</h3>
                        <p className="text-gray-400 text-sm flex-grow">View your periodic examination scores and detailed feedback.</p>
                      </div>

                      {/* Locked: Final Result */}
                      <div 
                        onClick={() => showComingSoon("Final Results")}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-6 cursor-not-allowed flex flex-col h-full relative overflow-hidden group"
                      >
                        <div className="absolute top-4 right-4 bg-white p-1.5 rounded-full shadow-sm">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center mb-4">
                          <Award className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-500 mb-2">Final Result</h3>
                        <p className="text-gray-400 text-sm flex-grow">Access your overall program performance, aggregate score, and certification.</p>
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
      <footer className="w-full py-6 border-t border-gray-200 bg-white text-center shrink-0">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#001232] hover:text-[#FFB902] transition-colors">
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
      `}} />
    </div>
  );
}