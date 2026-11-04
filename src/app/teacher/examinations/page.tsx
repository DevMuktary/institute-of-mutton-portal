"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap, Plus, ArrowLeft, Calendar, Clock,
  Users, CheckCircle2, AlertCircle, Trash2, Edit3, Eye, Loader2, BookOpen
} from "lucide-react";
import TeacherNavbar from "@/components/TeacherNavbar";
import { formatExamDateRange } from "@/lib/timezone";

interface Program {
  id: string;
  titleEn: string;
  slug: string;
}

interface ExamItem {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  totalMarks: number;
  status: string;
  program: {
    id: string;
    titleEn: string;
  };
  _count: {
    questions: number;
    attempts: number;
  };
}

export default function TeacherExaminationsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch programs
      const progRes = await fetch("/api/teacher/dashboard");
      if (progRes.ok) {
        const progJson = await progRes.json();
        setPrograms(progJson.data || []);
      }

      // Fetch exams
      const examRes = await fetch("/api/teacher/exams");
      if (examRes.ok) {
        const examJson = await examRes.json();
        setExams(examJson.data || []);
      }
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (examId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the examination "${title}"? All attempts and answers will be permanently deleted.`)) {
      return;
    }

    setDeletingId(examId);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        setExams(prev => prev.filter(e => e.id !== examId));
        setToast({ msg: "Examination deleted successfully.", type: "success" });
      } else {
        setToast({ msg: "Failed to delete examination.", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error during deletion.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExams = selectedProgramId === "all"
    ? exams
    : exams.filter(e => e.program.id === selectedProgramId);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
          <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-3 flex items-center gap-3 w-80 max-w-full ${toast.type === "success" ? "border-green-500 text-green-800" : "border-red-500 text-red-800"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <p className="text-sm font-semibold">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* Global App Header (Website & Portal Navigation Only) */}
      <TeacherNavbar />

      {/* Main Content Area with generous mobile breathing space */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        
        {/* Back Link to Control Panel */}
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#001232] transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Control Panel</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#001232] tracking-tight">Manage Examinations</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Create, configure, and monitor objective examinations
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Program Filter */}
            {programs.length > 0 && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={selectedProgramId}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  className="text-xs sm:text-sm font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-[#001232] focus:outline-none focus:border-[#001232]"
                >
                  <option value="all">All Programs ({exams.length})</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.titleEn}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Create Exam Button */}
            <Link
              href="/teacher/examinations/create"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] text-xs sm:text-sm font-black rounded-xl shadow-xs transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Exam</span>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-gray-400 mt-3">Loading examinations...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#001232]">No Examinations Found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-5">
              {selectedProgramId === "all"
                ? "You haven't scheduled any objective examinations yet. Create an exam to assess your students."
                : "No examinations have been created for this program yet."}
            </p>
            <Link
              href="/teacher/examinations/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Examination
            </Link>
          </div>
        ) : (
          /* Exam Cards List (100% Mobile Optimized) */
          <div className="space-y-4">
            {filteredExams.map(exam => {
              const now = new Date();
              const start = new Date(exam.startsAt);
              const end = new Date(exam.endsAt);
              const isOpen = now >= start && now <= end;
              const isPast = now > end;

              return (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col gap-3"
                >
                  {/* Top line: Program badge + Status tag */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700">
                      {exam.program.titleEn}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {exam.status === "DRAFT" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          Draft (Unpublished)
                        </span>
                      ) : isOpen ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                          Live Now
                        </span>
                      ) : isPast ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                          Closed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Published
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#001232]">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{exam.description}</p>
                    )}
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-1 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      <span><strong>{exam._count.questions}</strong> Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span><strong>{exam.durationMinutes}</strong> Mins Timer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span><strong>{exam.totalMarks}</strong> Total Marks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span><strong>{exam._count.attempts}</strong> Attempts</span>
                    </div>
                  </div>

                  {/* Date Window */}
                  <div className="text-[11px] text-gray-500 bg-[#f8fafc] px-3 py-1.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-gray-700">Window: </span>
                      {formatExamDateRange(exam.startsAt, exam.endsAt)}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                    <div className="flex items-center gap-2">
                      {exam.status === "DRAFT" ? (
                        <Link
                          href={`/teacher/examinations/create?examId=${exam.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Resume / Edit Draft</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/teacher/examinations/${exam.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#001232] hover:bg-[#002255] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
                        >
                          <Eye className="w-4 h-4 text-[#FFB902]" />
                          <span>Monitor & Grade</span>
                        </Link>
                      )}

                      <Link
                        href={`/teacher/examinations/create?examId=${exam.id}`}
                        className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                        title="Edit Exam / Questions"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                    </div>

                    <button
                      onClick={() => handleDelete(exam.id, exam.title)}
                      disabled={deletingId === exam.id}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete Exam"
                    >
                      {deletingId === exam.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
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
