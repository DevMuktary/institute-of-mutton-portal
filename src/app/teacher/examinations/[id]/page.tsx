"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, RefreshCw, Users, CheckCircle2, AlertCircle,
  Clock, ShieldAlert, Award, FileText, ChevronDown, ChevronUp,
  Loader2, Check, X, Search, Sparkles, Trash2
} from "lucide-react";
import TeacherNavbar from "@/components/TeacherNavbar";
import { formatExamTime } from "@/lib/timezone";

interface StudentAnswerAudit {
  questionOrder: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  marksAwarded: number;
  questionMarks: number;
}

interface SubmittedCandidate {
  id: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  startedAt: string;
  submittedAt: string;
  status: string;
  scoreObtained: number;
  totalMarks: number;
  grade: string;
  tabSwitches: number;
  answers: StudentAnswerAudit[];
}

interface InProgressCandidate {
  id: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  startedAt: string;
  answeredCount: number;
  totalQuestions: number;
  remainingSeconds: number;
  tabSwitches: number;
  hasExpired: boolean;
}

export default function TeacherExamMonitoringPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"submitted" | "live" | "notStarted">("submitted");
  const [exam, setExam] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    totalEnrolled: 0,
    inProgressCount: 0,
    submittedCount: 0,
    notStartedCount: 0
  });
  const [inProgress, setInProgress] = useState<InProgressCandidate[]>([]);
  const [submitted, setSubmitted] = useState<SubmittedCandidate[]>([]);
  const [notStarted, setNotStarted] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetchMonitoringData();
    // Auto refresh every 20 seconds while monitoring
    const interval = setInterval(() => {
      fetchMonitoringData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [examId]);

  const fetchMonitoringData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/teacher/exams/${examId}/monitor`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        setExam(json.data.exam);
        setStats(json.data.stats);
        setInProgress(json.data.inProgress || []);
        setSubmitted(json.data.submitted || []);
        setNotStarted(json.data.notStarted || []);
      }
    } catch (err) {
      if (!silent) setToast({ msg: "Failed to load examination monitoring data.", type: "error" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSyncToMasterSheet = async () => {
    if (submitted.length === 0) {
      return setToast({ msg: "No completed examinations to sync yet.", type: "info" });
    }

    setIsSyncing(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}/sync`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ msg: json.message || "Scores synced to master marksheet!", type: "success" });
      } else {
        setToast({ msg: json.error || "Failed to sync scores.", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error during sync.", type: "error" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!confirm(`Are you sure you want to permanently delete this examination? All student attempts, scores, and answer audit logs will be permanently deleted.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/teacher/examinations");
      } else {
        const json = await res.json();
        setToast({ msg: json.error || "Failed to delete examination.", type: "error" });
        setIsDeleting(false);
      }
    } catch {
      setToast({ msg: "Network error during deletion.", type: "error" });
      setIsDeleting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredSubmitted = submitted.filter(s =>
    s.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
          <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-3 flex items-center gap-3 w-80 max-w-full ${
            toast.type === "success" ? "border-green-500 text-green-800" :
            toast.type === "info" ? "border-blue-500 text-blue-800" :
            "border-red-500 text-red-800"
          }`}>
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
            {toast.type === "info" && <Award className="w-5 h-5 text-blue-500 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <p className="text-sm font-semibold">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* Global App Header (Website & Portal Navigation Only) */}
      <TeacherNavbar />

      {/* Main Content with comfortable mobile spacing */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Page Back Link & Action Bar (Brought Down into Page Body) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/teacher/examinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#001232] transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Examinations</span>
          </Link>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchMonitoringData(false)}
              disabled={isRefreshing}
              className="p-2 sm:p-2.5 text-gray-600 hover:text-[#001232] rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              onClick={handleSyncToMasterSheet}
              disabled={isSyncing || submitted.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Sync to Master Sheet</span>
            </button>

            <button
              onClick={handleDeleteExam}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50 shrink-0"
              title="Delete this examination permanently"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
              <span className="hidden sm:inline">Delete Exam</span>
            </button>
          </div>
        </div>
        
        {/* Exam Title & Stats Banner */}
        {exam && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700">
                {exam.program?.titleEn}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Ceiling: <strong>{exam.totalMarks} Marks</strong> • {exam.durationMinutes} Mins
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#001232]">{exam.title}</h1>

            {/* Quick Metrics (Mobile 2x2 Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-gray-100 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Enrolled</span>
                <p className="text-xl font-black text-[#001232] mt-0.5">{stats.totalEnrolled}</p>
              </div>
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                <span className="text-[11px] font-bold text-amber-700 uppercase">Live Active</span>
                <p className="text-xl font-black text-amber-600 mt-0.5">{stats.inProgressCount}</p>
              </div>
              <div className="bg-green-50/60 p-3 rounded-xl border border-green-100 text-center">
                <span className="text-[11px] font-bold text-green-700 uppercase">Submitted</span>
                <p className="text-xl font-black text-green-700 mt-0.5">{stats.submittedCount}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Pending</span>
                <p className="text-xl font-black text-gray-500 mt-0.5">{stats.notStartedCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation (Mobile-first Segmented Control) */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center text-xs sm:text-sm font-bold text-gray-600">
          <button
            onClick={() => setActiveTab("submitted")}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "submitted"
                ? "bg-white text-[#001232] shadow-sm font-extrabold"
                : "hover:text-[#001232]"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Submitted ({stats.submittedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "live"
                ? "bg-white text-[#001232] shadow-sm font-extrabold"
                : "hover:text-[#001232]"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Live ({stats.inProgressCount})</span>
            {stats.inProgressCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("notStarted")}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "notStarted"
                ? "bg-white text-[#001232] shadow-sm font-extrabold"
                : "hover:text-[#001232]"
            }`}
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span>Pending ({stats.notStartedCount})</span>
          </button>
        </div>

        {/* TAB 1: SUBMITTED LEDGER (ADMIN/TEACHER ONLY GRADES & AUDIT) */}
        {activeTab === "submitted" && (
          <div className="space-y-3">
            {/* Search Input */}
            {submitted.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter candidate by name or email..."
                  className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#001232]"
                />
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#001232] mx-auto" />
              </div>
            ) : filteredSubmitted.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-sm">
                No examination submissions recorded yet.
              </div>
            ) : (
              filteredSubmitted.map(sub => {
                const isExpanded = expandedStudentId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedStudentId(isExpanded ? null : sub.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#f8fafc] transition-colors"
                    >
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-[#001232] truncate">
                            {sub.student.fullName}
                          </h3>
                          {sub.tabSwitches > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              {sub.tabSwitches} tab exit{sub.tabSwitches > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{sub.student.email}</p>
                      </div>

                      {/* Score & Letter Grade Pill */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-[#001232]">
                            {sub.scoreObtained} <span className="text-xs text-gray-400 font-semibold">/ {sub.totalMarks}</span>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                            sub.grade === "A" ? "bg-green-100 text-green-800" :
                            sub.grade === "B" ? "bg-blue-100 text-blue-800" :
                            sub.grade === "C" ? "bg-amber-100 text-amber-800" :
                            sub.grade === "D" ? "bg-orange-100 text-orange-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            Grade {sub.grade}
                          </span>
                        </div>

                        <div className="text-gray-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Question-by-Question Audit Breakdown */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-[#f8fafc] border-t border-gray-100 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-200 pb-2">
                          <span>Submitted: {formatExamTime(sub.submittedAt)}</span>
                          <span>Responses Audit ({sub.answers.length} Questions)</span>
                        </div>

                        <div className="space-y-2.5">
                          {sub.answers.map(ans => (
                            <div
                              key={ans.questionOrder}
                              className={`p-3 rounded-xl border text-xs sm:text-sm ${
                                ans.isCorrect
                                  ? "bg-green-50/60 border-green-200"
                                  : "bg-red-50/40 border-red-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-[#001232]">
                                  Q{ans.questionOrder}:
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ans.isCorrect ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900"
                                }`}>
                                  {ans.marksAwarded} / {ans.questionMarks} Mark{ans.questionMarks > 1 ? "s" : ""}
                                </span>
                              </div>

                              {/* Question Stem in Arabic Font */}
                              <p dir="auto" className="font-amiri text-sm sm:text-base font-semibold text-gray-800 mt-1">
                                {ans.questionText}
                              </p>

                              {/* Option Chosen vs Correct */}
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-white/80 border border-gray-200">
                                  <span className="text-gray-500 font-semibold">Student Answer: </span>
                                  <strong className={ans.isCorrect ? "text-green-700" : "text-red-700"}>
                                    Option {ans.selectedOption || "None (Unanswered)"}
                                  </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-white/80 border border-gray-200">
                                  <span className="text-gray-500 font-semibold">Correct Answer: </span>
                                  <strong className="text-green-700">Option {ans.correctOption}</strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: LIVE PROCTORING (STUDENTS CURRENTLY WRITING EXAM) */}
        {activeTab === "live" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#001232] mx-auto" />
              </div>
            ) : inProgress.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-sm">
                No students currently taking the exam.
              </div>
            ) : (
              inProgress.map(cand => (
                <div
                  key={cand.id}
                  className="bg-white border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                      <h3 className="text-sm sm:text-base font-bold text-[#001232] truncate">
                        {cand.student.fullName}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{cand.student.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-gray-500">
                      <span>Answered: <strong>{cand.answeredCount} / {cand.totalQuestions}</strong></span>
                      {cand.tabSwitches > 0 && (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> {cand.tabSwitches} exits
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Timer Remaining</span>
                    <div className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                      {formatTimer(cand.remainingSeconds)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: NOT STARTED */}
        {activeTab === "notStarted" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Enrolled Candidates Yet to Start</h3>
            {notStarted.length === 0 ? (
              <p className="text-xs text-gray-400">All enrolled students have attempted this examination.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notStarted.map(st => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-[#001232]">{st.fullName}</span>
                    <span className="text-gray-400">{st.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
