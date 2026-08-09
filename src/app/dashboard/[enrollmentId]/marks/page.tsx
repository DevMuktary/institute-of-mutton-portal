"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, TrendingUp, Award, BookOpen } from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  maxDailyMark: number;
}

interface DailyMark {
  id: string;
  dayLabel: string;
  score: number;
  date: string;
}

interface DashboardData {
  program: Program;
  marks: DailyMark[];
}

export default function DailyMarksPage() {
  const router = useRouter();
  const params = useParams();
  const enrollmentId = params?.enrollmentId as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const res = await fetch(`/api/dashboard/${enrollmentId}/marks`);
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          else setError("Failed to load your progress. Please try again.");
          return;
        }
        
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        setError("A network error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    if (enrollmentId) fetchMarks();
  }, [enrollmentId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#001232] mb-2">Unable to load marks</h2>
        <p className="text-gray-500 mb-6">{error || "Something went wrong."}</p>
        <Link href="/dashboard" className="bg-[#001232] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#001232]/90 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate Statistics
  const totalEntries = data.marks.length;
  const averageScore = totalEntries > 0 
    ? (data.marks.reduce((acc, curr) => acc + curr.score, 0) / totalEntries).toFixed(1) 
    : "0";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full font-sans">
      
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                <Image src="/mutoon-logo.png" alt="Logo" width={28} height={28} className="object-contain" priority />
              </div>
              <span className="font-extrabold text-[#001232] text-[16px] sm:text-lg tracking-tight">
                Institute of Mutoon
              </span>
            </div>
            
            <Link 
              href="/dashboard"
              className="flex items-center text-sm font-bold text-gray-500 hover:text-[#001232] transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 dir="auto" className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight leading-snug break-words">
            {data.program.titleEn}
          </h1>
          <p className="text-gray-500 mt-2 text-[15px] font-medium">Daily Progress Log</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Entries Logged</span>
            </div>
            <span className="text-3xl font-extrabold text-[#001232]">{totalEntries}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Average Score</span>
            </div>
            <span className="text-3xl font-extrabold text-[#001232]">{averageScore} <span className="text-sm font-medium text-gray-400">/ {data.program.maxDailyMark}</span></span>
          </div>

          <div className="bg-[#001232] p-5 rounded-2xl border border-[#001232] shadow-md flex flex-col col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 text-[#FFB902] mb-2">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Max Potential</span>
            </div>
            <span className="text-3xl font-extrabold text-white">{data.program.maxDailyMark} <span className="text-sm font-medium text-gray-400">per day</span></span>
          </div>
        </div>

        {/* Marks List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-lg font-extrabold text-[#001232]">Recent Logs</h3>
          </div>
          
          <div className="p-0">
            {data.marks.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                  <CalendarDays className="w-8 h-8 text-gray-300" />
                </div>
                <h4 className="text-xl font-bold text-gray-400 mb-2">No entries yet</h4>
                <p className="text-gray-400 text-sm max-w-sm">
                  Your daily marks will appear here once your teacher starts logging your progress.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.marks.map((mark) => {
                  const dateObj = new Date(mark.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  
                  // Highlight colors based on score percentage
                  const percentage = (mark.score / data.program.maxDailyMark) * 100;
                  const isExcellent = percentage >= 90;
                  const isGood = percentage >= 70 && percentage < 90;
                  
                  return (
                    <li key={mark.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex flex-col items-center justify-center shrink-0 border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">{dateObj.toLocaleString('en-US', { month: 'short' })}</span>
                          <span className="text-lg font-extrabold text-[#001232] leading-tight">{dateObj.getDate()}</span>
                        </div>
                        <div>
                          <p dir="auto" className="font-extrabold text-[#001232] text-[16px] break-words">{mark.dayLabel}</p>
                          <p className="text-sm font-medium text-gray-500 mt-0.5">{formattedDate} • {formattedTime}</p>
                        </div>
                      </div>

                      <div className="flex items-center self-start sm:self-center ml-16 sm:ml-0">
                        <div className={`px-4 py-2 rounded-xl border flex items-baseline space-x-1 ${
                          isExcellent ? "bg-green-50 border-green-200 text-green-700" :
                          isGood ? "bg-blue-50 border-blue-200 text-blue-700" :
                          "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          <span className="text-lg font-extrabold">{mark.score}</span>
                          <span className="text-xs font-bold opacity-60">/ {data.program.maxDailyMark}</span>
                        </div>
                      </div>
                      
                    </li>
                  );
                })}
              </ul>
            )}
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
    </div>
  );
}