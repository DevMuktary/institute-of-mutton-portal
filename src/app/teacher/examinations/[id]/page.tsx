"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, RefreshCw, Users, CheckCircle2, AlertCircle,
  Clock, ShieldAlert, Award, FileText, ChevronDown, ChevronUp,
  Loader2, Check, X, Search, Sparkles, Trash2, RotateCcw,
  Edit3, Sliders, AlertTriangle
} from "lucide-react";
import TeacherNavbar from "@/components/TeacherNavbar";
import { formatExamTime, formatDateToLagosInput, lagosInputToIso, APP_TIMEZONE_LABEL } from "@/lib/timezone";

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

  // Candidate Attempt Reset modal state
  const [candidateForReset, setCandidateForReset] = useState<{ id: string; studentName: string; email: string; score?: number } | null>(null);
  const [isResettingAttempt, setIsResettingAttempt] = useState(false);

  // Candidate Score Override modal state
  const [candidateForScoreEdit, setCandidateForScoreEdit] = useState<{ id: string; studentName: string; currentScore: number; tabSwitches: number; grade: string } | null>(null);
  const [newScoreInput, setNewScoreInput] = useState<string>("");
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  // Delete Exam modal state
  const [isDeleteExamModalOpen, setIsDeleteExamModalOpen] = useState(false);

  // Extend Exam Time modal state
  const [isExtendTimeModalOpen, setIsExtendTimeModalOpen] = useState(false);
  const [extendDurationInput, setExtendDurationInput] = useState<string>("");
  const [extendEndsAtInput, setExtendEndsAtInput] = useState<string>("");
  const [isSavingTimeExtension, setIsSavingTimeExtension] = useState(false);

  const getGradePreview = (scoreVal: number, maxScore: number) => {
    if (!maxScore || maxScore <= 0 || isNaN(scoreVal)) return "F";
    const pct = (scoreVal / maxScore) * 100;
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };

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

  const handleConfirmResetAttempt = async () => {
    if (!candidateForReset) return;
    setIsResettingAttempt(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}/attempts/${candidateForReset.id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ msg: json.message || "Attempt reset successfully. Student can now retake.", type: "success" });
        setCandidateForReset(null);
        fetchMonitoringData(true);
      } else {
        setToast({ msg: json.error || "Failed to reset attempt.", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error during attempt reset.", type: "error" });
    } finally {
      setIsResettingAttempt(false);
    }
  };

  const handleConfirmScoreEdit = async () => {
    if (!candidateForScoreEdit) return;
    const num = parseFloat(newScoreInput);
    if (isNaN(num) || num < 0 || (exam && num > exam.totalMarks)) {
      setToast({ msg: `Please enter a valid score between 0 and ${exam?.totalMarks || 100}.`, type: "error" });
      return;
    }

    setIsUpdatingScore(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}/attempts/${candidateForScoreEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: num })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast({ msg: json.message || "Score updated successfully!", type: "success" });
        setCandidateForScoreEdit(null);
        fetchMonitoringData(true);
      } else {
        setToast({ msg: json.error || "Failed to update score.", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error updating score.", type: "error" });
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleConfirmDeleteExam = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/teacher/examinations");
      } else {
        const json = await res.json();
        setToast({ msg: json.error || "Failed to delete examination.", type: "error" });
        setIsDeleting(false);
        setIsDeleteExamModalOpen(false);
      }
    } catch {
      setToast({ msg: "Network error during deletion.", type: "error" });
      setIsDeleting(false);
      setIsDeleteExamModalOpen(false);
    }
  };

  const handleOpenExtendTimeModal = () => {
    if (!exam) return;
    setExtendDurationInput(String(exam.durationMinutes || 60));
    setExtendEndsAtInput(formatDateToLagosInput(exam.endsAt));
    setIsExtendTimeModalOpen(true);
  };

  const handleQuickAddMinutes = (additionalMins: number) => {
    const currentDur = parseInt(extendDurationInput, 10) || (exam?.durationMinutes || 60);
    const newDur = currentDur + additionalMins;
    setExtendDurationInput(String(newDur));

    if (extendEndsAtInput) {
      const currentEnds = new Date(lagosInputToIso(extendEndsAtInput));
      if (!isNaN(currentEnds.getTime())) {
        const advanced = new Date(currentEnds.getTime() + additionalMins * 60 * 1000);
        setExtendEndsAtInput(formatDateToLagosInput(advanced));
      }
    }
  };

  const handleSaveTimeExtension = async () => {
    if (!extendDurationInput || Number(extendDurationInput) < 5) {
      setToast({ msg: "Please enter a valid duration (minimum 5 minutes).", type: "error" });
      return;
    }
    if (!extendEndsAtInput) {
      setToast({ msg: "Please specify an exam close time.", type: "error" });
      return;
    }

    setIsSavingTimeExtension(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: Number(extendDurationInput),
          endsAt: lagosInputToIso(extendEndsAtInput)
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to extend exam time.");

      setToast({ msg: `Exam extended to ${extendDurationInput} mins! Active student timers are now updated.`, type: "success" });
      setIsExtendTimeModalOpen(false);
      fetchMonitoringData(false);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to extend exam time.", type: "error" });
    } finally {
      setIsSavingTimeExtension(false);
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

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => fetchMonitoringData(false)}
              disabled={isRefreshing}
              className="p-2 sm:p-2.5 text-gray-600 hover:text-[#001232] rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Quick Safe Exam Time Extension */}
            <button
              type="button"
              onClick={handleOpenExtendTimeModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all shrink-0"
              title="Safely extend exam time without touching questions"
            >
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Extend Time</span>
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
              onClick={() => setIsDeleteExamModalOpen(true)}
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

                      {/* Score & Letter Grade Pill + Actions */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

                        {/* Adjust / Reconcile Score Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateForScoreEdit({
                              id: sub.id,
                              studentName: sub.student.fullName,
                              currentScore: sub.scoreObtained,
                              tabSwitches: sub.tabSwitches,
                              grade: sub.grade
                            });
                            setNewScoreInput(String(sub.scoreObtained));
                          }}
                          className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Adjust Candidate Score / Reconcile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Reset Attempt / Allow Retake Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateForReset({
                              id: sub.id,
                              studentName: sub.student.fullName,
                              email: sub.student.email,
                              score: sub.scoreObtained
                            });
                          }}
                          className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                          title="Reset Attempt (Allow Retake)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

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
                          <span>Responses Audit</span>
                        </div>

                        {/* If questions were re-indexed during edit and individual choices were reset */}
                        {sub.scoreObtained > 0 && sub.answers.every(a => a.selectedOption === null) ? (
                          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-2.5 my-2">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                              <Award className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-amber-900">
                                Official Verified Score: {sub.scoreObtained} / {sub.totalMarks} Marks (Grade {sub.grade})
                              </h4>
                              <p className="text-xs text-amber-800 max-w-md mx-auto mt-1 leading-relaxed">
                                This candidate completed the examination prior to the live schedule extension. Their final score and master marksheet record are 100% verified and recorded. Individual question breakdown is archived because questions were re-indexed.
                              </p>
                            </div>
                          </div>
                        ) : (
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
                        )}
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

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Timer Remaining</span>
                      <div className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                        {formatTimer(cand.remainingSeconds)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCandidateForReset({
                          id: cand.id,
                          studentName: cand.student.fullName,
                          email: cand.student.email
                        });
                      }}
                      className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-gray-100"
                      title="Reset Attempt (Allow Restart)"
                    >
                      <RotateCcw className="w-4 h-4 text-red-600" />
                    </button>
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

        {/* ========================================================
            MODAL 1: DESIGNED RESET ATTEMPT CONFIRMATION (ALLOW RETAKE)
           ======================================================== */}
        {candidateForReset && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 mx-auto sm:mx-0">
                <RotateCcw className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#001232]">Reset Examination Attempt?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  This will permanently delete this student&apos;s attempt, response logs, and recorded score. The student will be permitted to retake the examination from scratch.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-200 text-xs space-y-1">
                <p className="text-gray-500 font-medium">Candidate:</p>
                <p className="text-sm font-bold text-[#001232]">{candidateForReset.studentName}</p>
                <p className="text-gray-400 font-mono text-[11px]">{candidateForReset.email}</p>
                {candidateForReset.score !== undefined && (
                  <p className="text-gray-600 pt-1.5 border-t border-gray-200 mt-1.5">
                    Recorded Score: <strong>{candidateForReset.score} / {exam?.totalMarks}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCandidateForReset(null)}
                  disabled={isResettingAttempt}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetAttempt}
                  disabled={isResettingAttempt}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isResettingAttempt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Yes, Reset & Allow Retake</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: DESIGNED SCORE ADJUSTMENT / RECONCILIATION MODAL
           ======================================================== */}
        {candidateForScoreEdit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#001232]">Adjust Candidate Score</h3>
                    <p className="text-[11px] text-gray-400">Reconcile question errors or apply penalties</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCandidateForScoreEdit(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Candidate Info Header */}
              <div className="p-3 rounded-2xl bg-[#f8fafc] border border-gray-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Candidate</span>
                  <span className="text-sm font-bold text-[#001232]">{candidateForScoreEdit.studentName}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Current Score</span>
                  <span className="text-xs font-bold text-gray-700">
                    {candidateForScoreEdit.currentScore} / {exam?.totalMarks} (Grade {candidateForScoreEdit.grade})
                  </span>
                </div>
              </div>

              {/* Tab Switch Penalty Quick-Actions */}
              {candidateForScoreEdit.tabSwitches > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Candidate exited exam tab {candidateForScoreEdit.tabSwitches} time{candidateForScoreEdit.tabSwitches > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const current = candidateForScoreEdit.currentScore;
                        const penalized = Math.max(0, current - candidateForScoreEdit.tabSwitches);
                        setNewScoreInput(String(penalized));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-[11px] font-bold transition-colors"
                    >
                      Deduct {candidateForScoreEdit.tabSwitches} mark{candidateForScoreEdit.tabSwitches > 1 ? "s" : ""} (-1 / exit)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = candidateForScoreEdit.currentScore;
                        const penalized = Math.max(0, current - (candidateForScoreEdit.tabSwitches * 2));
                        setNewScoreInput(String(penalized));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-[11px] font-bold transition-colors"
                    >
                      Deduct {candidateForScoreEdit.tabSwitches * 2} marks (-2 / exit)
                    </button>
                  </div>
                </div>
              )}

              {/* Score Input & Grade Calculation Preview */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    New Adjusted Score (0 - {exam?.totalMarks || 100}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={exam?.totalMarks || 100}
                      value={newScoreInput}
                      onChange={e => setNewScoreInput(e.target.value)}
                      required
                      className="w-full text-base font-bold bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-gray-400">
                      / {exam?.totalMarks} Marks
                    </span>
                  </div>
                </div>

                {/* Dynamic Calculated Grade Preview */}
                {(() => {
                  const val = parseFloat(newScoreInput);
                  const max = exam?.totalMarks || 100;
                  const previewGrade = getGradePreview(val, max);
                  return (
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-600">Calculated Letter Grade:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        previewGrade === "A" ? "bg-green-100 text-green-800" :
                        previewGrade === "B" ? "bg-blue-100 text-blue-800" :
                        previewGrade === "C" ? "bg-amber-100 text-amber-800" :
                        previewGrade === "D" ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        Grade {previewGrade}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCandidateForScoreEdit(null)}
                  disabled={isUpdatingScore}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmScoreEdit}
                  disabled={isUpdatingScore}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#001232] hover:bg-[#002255] text-[#FFB902] text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Adjusted Score</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 3: DESIGNED DELETE EXAMINATION CONFIRMATION
           ======================================================== */}
        {isDeleteExamModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 mx-auto sm:mx-0">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#001232]">Permanently Delete Examination?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  This will permanently delete this examination, its questions, all candidate attempts, scores, and answer audit logs. This action cannot be reversed.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-gray-200 text-xs space-y-1">
                <p className="text-gray-500 font-medium">Examination Title:</p>
                <p className="text-sm font-bold text-[#001232]">{exam?.title}</p>
                <p className="text-gray-500 text-[11px]">{exam?.program?.titleEn}</p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteExamModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExam}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Yes, Delete Exam</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 4: DESIGNED EXTEND EXAM TIME / ADJUST SCHEDULE
           ======================================================== */}
        {isExtendTimeModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#001232]">Extend Exam Time</h3>
                    <p className="text-[11px] text-gray-400">Safely adjusts student countdown & close time</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExtendTimeModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informative Safety Notice */}
              <div className="p-3 rounded-2xl bg-green-50 border border-green-200 text-[11px] text-green-900 leading-relaxed">
                ✅ <strong>Zero Risk:</strong> This updates only time parameters. Questions and student answers are strictly preserved and never touched.
              </div>

              {/* Quick Add Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Quick Add Minutes
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleQuickAddMinutes(mins)}
                      className="py-2 px-2.5 rounded-xl bg-gray-100 hover:bg-[#001232] hover:text-[#FFB902] font-black text-xs text-[#001232] transition-all"
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Student Timer Duration (Minutes) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={extendDurationInput}
                    onChange={e => setExtendDurationInput(e.target.value)}
                    required
                    className="w-full text-base font-bold bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-gray-400">
                    Minutes
                  </span>
                </div>
              </div>

              {/* Close Time Input (WAT) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Exam Close Time *
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {APP_TIMEZONE_LABEL} (UTC+1)
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={extendEndsAtInput}
                  onChange={e => setExtendEndsAtInput(e.target.value)}
                  required
                  className="w-full text-sm font-bold bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExtendTimeModalOpen(false)}
                  disabled={isSavingTimeExtension}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeExtension}
                  disabled={isSavingTimeExtension}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingTimeExtension ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Extended Time</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
