"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Clock, AlertCircle, CheckCircle2, ChevronLeft,
  ChevronRight, ShieldAlert, Check, Loader2, LayoutGrid, X
} from "lucide-react";

interface Question {
  id: string;
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  marks: number;
}

interface ExamPreScreenData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  program: {
    id: string;
    titleEn: string;
  };
  durationMinutes: number;
  totalMarks: number;
  questionsCount: number;
  isWithinWindow: boolean;
  isSubmitted: boolean;
}

export default function StudentExamRunnerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: examId } = use(params);
  const router = useRouter();

  // Screen state
  const [screen, setScreen] = useState<"loading" | "prescreen" | "taking" | "submitted" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Prescreen data
  const [examMeta, setExamMeta] = useState<ExamPreScreenData | null>(null);

  // Taking state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Telemetry ref to prevent spam
  const lastBlurRef = useRef<number>(0);

  // 1. Initial Load: Fetch Exam Meta
  useEffect(() => {
    const loadExamMeta = async () => {
      try {
        const res = await fetch(`/api/exam/${examId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setErrorMessage(json.error || "Unable to access this examination.");
          setScreen("error");
          return;
        }

        const data: ExamPreScreenData = json.data;
        setExamMeta(data);

        if (data.isSubmitted) {
          setScreen("submitted");
        } else if (!data.isWithinWindow) {
          setErrorMessage("This examination is outside its scheduled availability window.");
          setScreen("error");
        } else {
          setScreen("prescreen");
        }
      } catch (err) {
        setErrorMessage("Network error loading examination details.");
        setScreen("error");
      }
    };

    loadExamMeta();
  }, [examId]);

  // 2. Start or Resume Exam
  const handleStartExam = async () => {
    setScreen("loading");
    try {
      const res = await fetch(`/api/exam/${examId}/start`, { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.error || "Failed to start examination.");
        setScreen("error");
        return;
      }

      setQuestions(json.data.questions || []);
      const serverAnswers = json.data.answers || {};
      let localCached: Record<string, string> = {};
      try {
        const stored = localStorage.getItem(`exam_answers_${examId}`);
        if (stored) localCached = JSON.parse(stored);
      } catch {}
      const mergedAnswers = { ...localCached, ...serverAnswers };
      setAnswers(mergedAnswers);
      setRemainingSeconds(json.data.remainingSeconds || 0);
      setTabSwitches(json.data.tabSwitches || 0);
      setScreen("taking");
    } catch {
      setErrorMessage("Network error starting examination.");
      setScreen("error");
    }
  };

  // 3. Countdown Timer
  useEffect(() => {
    if (screen !== "taking") return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit on timer expiry
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen]);

  // 4. Anti-Cheat Visibility / Blur Monitor
  useEffect(() => {
    if (screen !== "taking") return;

    const recordViolation = () => {
      const now = Date.now();
      if (now - lastBlurRef.current < 3000) return; // Debounce 3s
      lastBlurRef.current = now;

      setTabSwitches(prev => prev + 1);
      setToastMessage("Warning: Leaving the exam tab is recorded.");

      // Fire telemetry
      fetch(`/api/exam/${examId}/telemetry`, { method: "POST" }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation();
    };

    const handleBlur = () => {
      recordViolation();
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [screen, examId]);

  // 5. Select Option (Instant Switch & Auto-Save with Local Cache)
  const handleSelectOption = (optionKey: "A" | "B" | "C" | "D") => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    // Immediately update local state and local backup
    setAnswers(prev => {
      const updated = { ...prev, [currentQ.id]: optionKey };
      try {
        localStorage.setItem(`exam_answers_${examId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Non-blocking background save to server
    fetch(`/api/exam/${examId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: currentQ.id,
        selectedOption: optionKey
      })
    }).catch(err => {
      console.warn("Auto-save answer background warning:", err);
    });
  };

  // 6. Submit Exam (Guaranteed delivery: sends complete answers dictionary as failsafe)
  const handleFinalSubmit = async (isAutoExpire = false) => {
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    try {
      // Gather latest answers from state + localStorage backup
      let latestAnswers = answers;
      try {
        const stored = localStorage.getItem(`exam_answers_${examId}`);
        if (stored) {
          latestAnswers = { ...JSON.parse(stored), ...answers };
        }
      } catch {}

      const res = await fetch(`/api/exam/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: latestAnswers })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit examination.");
      }

      // Success: clear local storage cache
      try {
        localStorage.removeItem(`exam_answers_${examId}`);
      } catch {}

      setScreen("submitted");
    } catch (err: any) {
      setToastMessage(err.message || "Failed to submit exam. Check your connection.");
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentIndex];

  // --- RENDER 1: LOADING STATE ---
  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-500 mt-3">Preparing examination session...</p>
      </div>
    );
  }

  // --- RENDER 2: ERROR STATE ---
  if (screen === "error") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#001232]">Examination Unavailable</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">{errorMessage}</p>
          <Link
            href="/dashboard/examinations"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#001232] text-white font-bold text-sm rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Examinations</span>
          </Link>
        </div>
      </div>
    );
  }

  // --- RENDER 3: SUBMITTED (COMPLETED & LOCKED) ---
  if (screen === "submitted") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-lg animate-fade-in">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl font-black text-[#001232]">Exam Submitted</h1>
          <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
            Your examination responses have been securely submitted to your instructor for evaluation.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs font-semibold text-amber-900 text-left">
            <p>• Your submission timestamp has been recorded.</p>
            <p className="mt-1">• Scores are reviewed by administration and will appear on your official certificate or program grade report.</p>
          </div>

          <Link
            href="/dashboard"
            className="w-full py-3 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // --- RENDER 4: PRE-SCREEN (ONBOARDING & ANTI-CHEAT RULES) ---
  if (screen === "prescreen" && examMeta) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-16">
        {/* Navbar */}
        <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
            <Link href="/dashboard/examinations" className="p-2 -ml-2 text-gray-500 hover:text-[#001232] rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <Image src="/mutoon-logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
              <span className="font-extrabold text-[#001232] text-base sm:text-lg">Examination Room</span>
            </div>
          </div>
        </nav>

        {/* Pre-Screen Container */}
        <main className="flex-grow w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700">
                {examMeta.program.titleEn}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#001232] mt-2">
                {examMeta.title}
              </h1>
              {examMeta.description && (
                <p className="text-sm text-gray-500 mt-1">{examMeta.description}</p>
              )}
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-gray-100 text-xs">
              <div className="bg-[#f8fafc] p-3 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-400 uppercase">Questions</span>
                <p className="text-lg font-black text-[#001232] mt-0.5">{examMeta.questionsCount} MCQs</p>
              </div>
              <div className="bg-[#f8fafc] p-3 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-400 uppercase">Timer Duration</span>
                <p className="text-lg font-black text-amber-600 mt-0.5">{examMeta.durationMinutes} Minutes</p>
              </div>
            </div>

            {/* Anti-Cheat & Rules Reminder */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Important Rules & Anti-Cheat Notice</span>
              </div>
              <p>• <strong>Do not minimize the browser window or switch tabs.</strong> All tab exits are recorded and flagged to the administrator.</p>
              <p>• Once you click <strong>Start Examination</strong>, your personal countdown timer starts immediately and cannot be paused.</p>
              <p>• When the timer expires, your answers will be automatically submitted.</p>
            </div>

            {/* Instructions */}
            {examMeta.instructions && (
              <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 whitespace-pre-line">
                <span className="font-bold text-gray-700 block mb-1">Teacher Instructions:</span>
                {examMeta.instructions}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartExam}
              className="w-full py-3.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-black text-sm sm:text-base rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Begin Examination Now</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- RENDER 5: ACTIVE EXAM RUNNER (100% MOBILE-FIRST & DISTRACTION-FREE) ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans select-none pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-18 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
          <div className="bg-[#001232] text-white border-l-4 border-[#FFB902] shadow-2xl rounded-r-xl p-3 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FFB902] shrink-0" />
            <p className="text-xs sm:text-sm font-semibold">{toastMessage}</p>
            <button onClick={() => setToastMessage(null)} className="ml-auto text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Top Exam Header */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2">
            <Image src="/mutoon-logo.png" alt="Logo" width={22} height={22} className="object-contain" priority />
            <span className="font-extrabold text-[#001232] text-sm sm:text-base truncate max-w-[140px] sm:max-w-none">
              {examMeta?.title || "Exam"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Countdown Timer */}
            <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border ${
              remainingSeconds < 300
                ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}>
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Question Review Drawer Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-gray-600 hover:text-[#001232] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors shrink-0"
              title="Question Grid Palette"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Header Submit Button (Safely isolated from question navigation) */}
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              title="Submit Examination"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1">
          <div
            className="bg-[#001232] h-1 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* Main Question Area */}
      <main className="flex-grow w-full max-w-2xl mx-auto px-4 py-5 flex flex-col justify-between">
        {currentQuestion && (
          <div className="space-y-5 animate-fade-in">
            {/* Question Progress Header */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-amber-700">
                {answers[currentQuestion.id] ? "Answered" : "Pending"}
              </span>
            </div>

            {/* Question Stem with Classical Arabic Amiri Font */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <p
                dir="auto"
                className="font-amiri text-lg sm:text-xl font-bold text-[#001232] leading-relaxed"
              >
                {currentQuestion.questionText}
              </p>
            </div>

            {/* Options A, B, C, D (Direct Switch & Auto-Save) */}
            <div className="space-y-3">
              {(["A", "B", "C", "D"] as const).map(optKey => {
                const fieldKey = `option${optKey}` as "optionA" | "optionB" | "optionC" | "optionD";
                const isSelected = answers[currentQuestion.id] === optKey;

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 group active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#001232] text-white border-[#001232] shadow-md"
                        : "bg-white hover:bg-gray-50 text-[#001232] border-gray-200"
                    }`}
                  >
                    {/* Letter Badge */}
                    <span
                      className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#FFB902] text-[#001232]"
                          : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
                      }`}
                    >
                      {optKey}
                    </span>

                    {/* Option Text with Arabic Font */}
                    <span
                      dir="auto"
                      className={`flex-grow font-amiri text-base sm:text-lg font-semibold leading-relaxed ${
                        isSelected ? "text-white" : "text-[#001232]"
                      }`}
                    >
                      {currentQuestion[fieldKey]}
                    </span>

                    {/* Selection Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#FFB902] bg-[#FFB902]" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#001232] stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (100% Focused on Question Navigation) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 py-3 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex-1 max-w-[130px] sm:max-w-[150px] py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#001232] font-bold text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Center Question Tracker (Tap to view all in palette) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="px-2 sm:px-3 py-1 rounded-xl hover:bg-gray-50 transition-colors text-center"
            title="View all questions"
          >
            <span className="text-xs sm:text-sm font-black text-[#001232] block">
              {currentIndex + 1} <span className="text-gray-400 font-normal">/</span> {questions.length}
            </span>
            <span className="text-[10px] font-bold text-gray-400 block whitespace-nowrap">
              {answeredCount} Answered
            </span>
          </button>

          {/* Next Button OR Final Question Submit */}
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="flex-1 max-w-[130px] sm:max-w-[150px] py-2.5 px-3 rounded-xl bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              className="flex-1 max-w-[150px] sm:max-w-[180px] py-2.5 px-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md animate-pulse"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish & Submit</span>
            </button>
          )}
        </div>
      </footer>

      {/* QUESTION REVIEW PALETTE DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full p-5 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-[#001232]">Question Review</h3>
                <p className="text-xs text-gray-500">
                  {answeredCount} of {questions.length} answered
                </p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2.5 py-4">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsDrawerOpen(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center relative ${
                      isCurrent
                        ? "ring-2 ring-[#FFB902] ring-offset-2"
                        : ""
                    } ${
                      isAnswered
                        ? "bg-[#001232] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsConfirmModalOpen(true);
                }}
                className="w-full py-3 bg-[#001232] text-[#FFB902] font-bold text-sm rounded-xl"
              >
                Proceed to Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM BRANDED CONFIRMATION MODAL (NO SYSTEM ALERTS) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-[#001232]">Submit Examination?</h3>
              <p className="text-xs text-gray-500 mt-1">
                You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              </p>
            </div>

            {/* Warning if unanswered */}
            {answeredCount < questions.length && (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl text-xs font-bold text-amber-900 text-center space-y-1">
                <p>⚠️ Attention: {questions.length - answeredCount} question(s) are still UNANSWERED!</p>
                <p className="font-normal text-[11px] text-amber-800">
                  Unanswered questions will receive 0 marks.
                </p>
              </div>
            )}

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Once submitted, your responses are finalized and you will not be able to re-enter this examination.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                Keep Answering
              </button>

              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
