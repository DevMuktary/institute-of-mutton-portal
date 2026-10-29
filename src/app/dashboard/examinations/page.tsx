"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, GraduationCap, Clock, Calendar, AlertCircle,
  CheckCircle2, ArrowRight, Lock, PlayCircle, Loader2
} from "lucide-react";

interface StudentExam {
  id: string;
  title: string;
  description?: string;
  program: {
    id: string;
    titleEn: string;
    slug: string;
  };
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  totalMarks: number;
  questionsCount: number;
  state: "UPCOMING" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  attempt?: {
    id: string;
    status: string;
  } | null;
}

export default function StudentExaminationsListPage() {
  const router = useRouter();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exam");
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setExams(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load examinations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:text-[#001232] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <Image src="/mutoon-logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
              <span className="font-extrabold text-[#001232] text-lg">Examinations</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#001232]">Your Examinations</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Objective assessments scheduled for your enrolled programs
          </p>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-gray-400 mt-3">Loading available assessments...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#001232]">No Examinations Scheduled</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              There are currently no active or upcoming examinations for your approved courses. Check back later or contact your instructor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map(exam => {
              const startDate = new Date(exam.startsAt);
              const endDate = new Date(exam.endsAt);

              return (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col gap-3"
                >
                  {/* Top Bar: Program & Status Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700">
                      {exam.program.titleEn}
                    </span>

                    <div>
                      {exam.state === "OPEN" && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-50 text-green-700 border border-green-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Available Now
                        </span>
                      )}
                      {exam.state === "IN_PROGRESS" && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          In Progress
                        </span>
                      )}
                      {exam.state === "COMPLETED" && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Submitted & Recorded
                        </span>
                      )}
                      {exam.state === "UPCOMING" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                          Upcoming
                        </span>
                      )}
                      {exam.state === "CLOSED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                          Window Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#001232]">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{exam.description}</p>
                    )}
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-t border-b border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      <span>{exam.questionsCount} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{exam.durationMinutes} Minutes Limit</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Closes at {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Window: {startDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>

                    {exam.state === "OPEN" && (
                      <Link
                        href={`/dashboard/examinations/${exam.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#001232] hover:bg-[#002255] text-[#FFB902] text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Start Exam</span>
                      </Link>
                    )}

                    {exam.state === "IN_PROGRESS" && (
                      <Link
                        href={`/dashboard/examinations/${exam.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Resume Exam</span>
                      </Link>
                    )}

                    {exam.state === "COMPLETED" && (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Exam Completed</span>
                      </button>
                    )}

                    {(exam.state === "UPCOMING" || exam.state === "CLOSED") && (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{exam.state === "UPCOMING" ? "Not Yet Open" : "Closed"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
