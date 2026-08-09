"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, LogOut, User, Clock, CheckCircle2, AlertCircle } from "lucide-react";

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

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeEnrollment, setActiveEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          // If unauthorized (401), kick them back to login
          if (res.status === 401) router.push("/login");
          return;
        }
        
        const json = await res.json();
        setUserData(json.data);
        
        // Auto-select the most recent enrollment as the active tab
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full overflow-x-hidden font-sans">
      
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#001232]">Assalamu Alaykum, {userData.fullName.split(" ")[0]}</h1>
          <p className="text-gray-500 mt-1 text-[16px]">Manage your memorization progress and programs here.</p>
        </div>

        {userData.enrollments.length === 0 ? (
          // Empty State if no programs
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
          <div className="flex flex-col space-y-6">
            
            {/* Program Switcher Tabs */}
            <div className="w-full">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full flex flex-col">
                
                {/* Canvas Header */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#001232]">{activeEnrollment.program.titleEn}</h2>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-sm font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-md">
                        Max Score: {activeEnrollment.program.maxDailyMark}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div>
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
                    <div className="text-center py-12 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      {/* Placeholder for Daily Marks/Exam Features */}
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-600">Your Study Canvas</h3>
                      <p className="text-sm text-gray-400 mt-1 max-w-sm">
                        This area will house your daily memorization marks, exam scores, and program statistics.
                      </p>
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

      {/* Hide scrollbar utility for the tab slider */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}