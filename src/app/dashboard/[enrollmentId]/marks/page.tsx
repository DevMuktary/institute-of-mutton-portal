"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, TrendingUp, Award, BookOpen, Target } from "lucide-react";

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

  // Calculate Core Statistics
  const totalEntries = data.marks.length;
  const totalScore = data.marks.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = totalEntries > 0 
    ? (totalScore / totalEntries).toFixed(1) 
    : "0";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full font-sans">
      
      {/* Compact Navbar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image src="/mutoon-logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
              <span className="font-extrabold text-[#001232] text-lg tracking-tight hidden sm:block">
                Institute of Mutoon
              </span>
            </div>
            
            <Link 
              href="/dashboard"
              className="flex items-center text-sm font-bold text-gray-500 hover:text-[#001232] transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col min-w-0">
        
        {/* Header Section */}
        <div className="mb-6 text-center sm:text-left">
          <h1 dir="auto" className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight leading-snug break-words">
            {data.program.titleEn}
          </h1>
          <p className="text-gray-500 mt-1 text-[15px] font-medium">Your Personal Progress Tracker</p>
        </div>

        {/* Hero Statistics - Focused on Total Score */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {/* Main Stat: Accumulated Score */}
          <div className="bg-[#001232] p-5 rounded-2xl border border-[#001232] shadow-lg flex flex-col col-span-2 sm:col-span-1 transform transition hover:-translate-y-1">
            <div className="flex items-center space-x-2 text-[#FFB902] mb-2">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Score</span>
            </div>
            <span className="text-4xl font-extrabold text-white">{totalScore}</span>
            <span className="text-xs font-medium text-gray-400 mt-1">Accumulated marks</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Average</span>
            </div>
            <span className="text-2xl font-extrabold text-[#001232]">
              {averageScore} <span className="text-sm font-bold text-gray-400">/ {data.program.maxDailyMark}</span>
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-gray-400 mb-1">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Days Logged</span>
            </div>
            <span className="text-2xl font-extrabold text-[#001232]">{totalEntries}</span>
          </div>
        </div>

        {/* Daily Marks Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-[#001232] flex items-center">
              <Target className="w-4 h-4 mr-2 text-[#FFB902]" /> Daily Breakdown
            </h3>
            <span className="text-xs font-bold text-gray-400 uppercase">Latest First</span>
          </div>
          
          <div>
            {data.marks.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                  <CalendarDays className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="text-lg font-bold text-gray-400 mb-1">No marks yet</h4>
                <p className="text-gray-400 text-sm max-w-xs">
                  Your progress will appear here as soon as your teacher logs your daily scores.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.marks.map((mark) => {
                  const dateObj = new Date(mark.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  
                  // Visual Indicator based on performance
                  const percentage = (mark.score / data.program.maxDailyMark) * 100;
                  const isExcellent = percentage >= 90;
                  const isGood = percentage >= 70 && percentage < 90;
                  
                  return (
                    <li key={mark.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                      
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200 group-hover:border-gray-300 transition-colors">
                          <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-[#001232] transition-colors" />
                        </div>
                        <div>
                          <p dir="auto" className="font-extrabold text-[#001232] text-[15px]">{mark.dayLabel}</p>
                          <p className="text-[13px] font-medium text-gray-500 mt-0.5">{formattedDate}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={`px-4 py-2 rounded-xl border flex items-baseline space-x-1 ${
                          isExcellent ? "bg-green-50 border-green-200 text-green-700" :
                          isGood ? "bg-blue-50 border-blue-200 text-blue-700" :
                          "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          <span className="text-lg font-extrabold">{mark.score}</span>
                          <span className="text-[11px] font-bold opacity-60">/ {data.program.maxDailyMark}</span>
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

      <footer className="w-full py-6 text-center shrink-0 mt-auto">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()} Quadrox Technologies
        </p>
      </footer>
    </div>
  );
}
