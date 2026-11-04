"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle,
  Save, Loader2, Clock, Calendar, Check, ArrowRight,
  HelpCircle, ChevronRight, ChevronLeft, Bookmark, Send
} from "lucide-react";
import TeacherNavbar from "@/components/TeacherNavbar";
import {
  formatDateToLagosInput,
  lagosInputToIso,
  getTodayLagosTimeString,
  APP_TIMEZONE_LABEL
} from "@/lib/timezone";

interface Program {
  id: string;
  titleEn: string;
  slug: string;
}

interface QuestionInput {
  id?: string;
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  marks: number;
}

function CreateExamWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingExamId = searchParams.get("examId");

  // Step state: 1 = General Info, 2 = Timing & Schedule, 3 = Questions
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Programs
  const [programs, setPrograms] = useState<Program[]>([]);
  const [examId, setExamId] = useState<string | null>(existingExamId);

  // Step 1: General Info
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "1. Ensure you have a stable internet connection.\n2. Do NOT minimize this window or switch browser tabs.\n3. Your countdown timer cannot be paused once started."
  );

  // Step 2: Time & Scoring
  const [startsAt, setStartsAt] = useState(getTodayLagosTimeString(8, 0));
  const [endsAt, setEndsAt] = useState(getTodayLagosTimeString(20, 0));
  const [durationMinutes, setDurationMinutes] = useState<number | string>(45);
  const [markPerQuestion, setMarkPerQuestion] = useState<number | string>(2);
  const [totalMarks, setTotalMarks] = useState<number | string>(60);
  const [isDeleting, setIsDeleting] = useState(false);

  // Step 3: Questions
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      order: 1,
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      marks: 2
    }
  ]);

  const [isLoadingExisting, setIsLoadingExisting] = useState(!!existingExamId);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" | "info" } | null>(null);

  // Load programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/teacher/dashboard");
        if (res.ok) {
          const json = await res.json();
          setPrograms(json.data || []);
          if (json.data?.length > 0 && !selectedProgramId) {
            setSelectedProgramId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load programs:", err);
      }
    };
    fetchPrograms();
  }, [selectedProgramId]);

  // Load existing exam if editing a draft
  useEffect(() => {
    if (!existingExamId) return;

    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/teacher/exams/${existingExamId}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.success && json.data) {
          const e = json.data;
          setExamId(e.id);
          setSelectedProgramId(e.programId);
          setTitle(e.title || "");
          setDescription(e.description || "");
          setInstructions(e.instructions || "");
          if (e.startsAt) {
            setStartsAt(formatDateToLagosInput(e.startsAt));
          }
          if (e.endsAt) {
            setEndsAt(formatDateToLagosInput(e.endsAt));
          }
          setDurationMinutes(e.durationMinutes || 45);
          setMarkPerQuestion(e.markPerQuestion || 2);
          setTotalMarks(e.totalMarks || 60);
          if (e.questions && e.questions.length > 0) {
            setQuestions(e.questions.map((q: any) => ({
              order: q.order,
              questionText: q.questionText || "",
              optionA: q.optionA || "",
              optionB: q.optionB || "",
              optionC: q.optionC || "",
              optionD: q.optionD || "",
              correctOption: q.correctOption || "A",
              marks: q.marks || 2
            })));
          }
        }
      } catch (err) {
        setToast({ msg: "Failed to load draft examination.", type: "error" });
      } finally {
        setIsLoadingExisting(false);
      }
    };

    loadDraft();
  }, [existingExamId]);

  // Update total marks whenever markPerQuestion or questions count changes
  useEffect(() => {
    const num = Number(markPerQuestion);
    if (!isNaN(num) && num > 0) {
      setTotalMarks(questions.length * num);
    }
  }, [questions.length, markPerQuestion]);

  // Step 1 Validation
  const handleNextStep1 = () => {
    if (!selectedProgramId) {
      return setToast({ msg: "Please select a program.", type: "error" });
    }
    if (!title.trim()) {
      return setToast({ msg: "Please enter an examination title.", type: "error" });
    }
    setCurrentStep(2);
  };

  // Step 2 Validation
  const handleNextStep2 = () => {
    if (!startsAt || !endsAt) {
      return setToast({ msg: "Please specify start and end dates.", type: "error" });
    }
    if (new Date(lagosInputToIso(endsAt)) <= new Date(lagosInputToIso(startsAt))) {
      return setToast({ msg: "Availability close time must be after start time.", type: "error" });
    }
    if (Number(durationMinutes) < 5) {
      return setToast({ msg: "Exam duration must be at least 5 minutes.", type: "error" });
    }
    setCurrentStep(3);
  };

  // Question editing helpers
  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        order: prev.length + 1,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "A",
        marks: Number(markPerQuestion) || 2
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setToast({ msg: "An examination must have at least one question.", type: "error" });
      return;
    }
    setQuestions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  const handleQuestionChange = (index: number, field: keyof QuestionInput, value: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save as Draft (Auto-saves so battery death or refresh loses nothing!)
  const handleSaveDraft = async () => {
    if (!selectedProgramId || !title.trim()) {
      setToast({ msg: "Please enter at least a program and title to save a draft.", type: "error" });
      return;
    }

    setIsSavingDraft(true);
    try {
      const payload = {
        programId: selectedProgramId,
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        startsAt: lagosInputToIso(startsAt),
        endsAt: lagosInputToIso(endsAt),
        durationMinutes: Number(durationMinutes) || 45,
        markPerQuestion: Number(markPerQuestion) || 2,
        totalMarks: Number(totalMarks) || 60,
        status: "DRAFT",
        questions
      };

      let res;
      if (examId) {
        // Update existing draft
        res = await fetch(`/api/teacher/exams/${examId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new draft
        res = await fetch("/api/teacher/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save draft.");

      if (!examId && json.data?.id) {
        setExamId(json.data.id);
      }

      setToast({ msg: "Draft saved successfully! You can resume editing anytime.", type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to save draft.", type: "error" });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Exam (Final validation)
  const handlePublishExam = async () => {
    if (!selectedProgramId) {
      setCurrentStep(1);
      return setToast({ msg: "Please select a program in Step 1.", type: "error" });
    }
    if (!title.trim()) {
      setCurrentStep(1);
      return setToast({ msg: "Please enter an examination title in Step 1.", type: "error" });
    }
    if (new Date(lagosInputToIso(endsAt)) <= new Date(lagosInputToIso(startsAt))) {
      setCurrentStep(2);
      return setToast({ msg: "Close time must be after start time in Step 2.", type: "error" });
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        return setToast({ msg: `Question ${i + 1} text cannot be empty.`, type: "error" });
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        return setToast({ msg: `Please fill all 4 options (A, B, C, D) for Question ${i + 1}.`, type: "error" });
      }
    }

    setIsPublishing(true);
    try {
      const payload = {
        programId: selectedProgramId,
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        startsAt: lagosInputToIso(startsAt),
        endsAt: lagosInputToIso(endsAt),
        durationMinutes: Number(durationMinutes),
        markPerQuestion: Number(markPerQuestion),
        totalMarks: Number(totalMarks),
        status: "PUBLISHED",
        questions
      };

      let res;
      if (examId) {
        res = await fetch(`/api/teacher/exams/${examId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/teacher/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to publish examination.");

      setToast({ msg: "Examination published live successfully!", type: "success" });
      setTimeout(() => {
        router.push("/teacher/examinations");
      }, 1200);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to publish examination.", type: "error" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!examId) return;
    if (!confirm("Are you sure you want to permanently delete this examination? All questions and student attempts will be removed.")) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete exam");
      setToast({ msg: "Examination deleted successfully.", type: "info" });
      setTimeout(() => {
        router.push("/teacher/examinations");
      }, 800);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to delete exam", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-500 mt-3">Loading draft examination...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-20 overflow-x-hidden w-full max-w-full">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
          <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-3 flex items-center gap-3 w-80 max-w-full ${
            toast.type === "success" ? "border-green-500 text-green-800" :
            toast.type === "info" ? "border-blue-500 text-blue-800" :
            "border-red-500 text-red-800"
          }`}>
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
            {toast.type === "info" && <Bookmark className="w-5 h-5 text-blue-500 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <p className="text-sm font-semibold">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* Global App Header (Website & Portal Navigation Only) */}
      <TeacherNavbar />

      {/* Main Content Area with clean mobile breathing room */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 box-border flex flex-col gap-5">
        
        {/* Page Header (Brought Down into the Page Body) */}
        <div className="flex flex-col gap-3">
          <Link
            href="/teacher/examinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#001232] transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Examinations</span>
          </Link>

          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#001232] tracking-tight">
                {examId ? "Edit Draft Examination" : "Create Examination"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                3-step objective MCQ assessment builder
              </p>
            </div>

            {/* Quick Actions (Delete if editing + Draft Save) */}
            <div className="flex items-center gap-2">
              {examId && (
                <button
                  type="button"
                  onClick={handleDeleteExam}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  title="Delete this examination"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span>Delete</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#001232] text-xs font-bold rounded-xl shadow-2xs transition-colors disabled:opacity-50 shrink-0"
                title="Save draft progress"
              >
                {isSavingDraft ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#001232]" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>Save Draft</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Step Wizard Navigation Tabs (Clean, Non-Sticky, Zero Overlapping) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-2xs">
          <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all ${
                currentStep === 1
                  ? "bg-[#001232] text-white shadow-xs"
                  : "text-gray-600 hover:text-[#001232] hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  currentStep === 1
                    ? "bg-[#FFB902] text-[#001232]"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                1
              </span>
              <span className="truncate">General</span>
            </button>

            <button
              type="button"
              onClick={() => handleNextStep1()}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all ${
                currentStep === 2
                  ? "bg-[#001232] text-white shadow-xs"
                  : "text-gray-600 hover:text-[#001232] hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  currentStep === 2
                    ? "bg-[#FFB902] text-[#001232]"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                2
              </span>
              <span className="truncate">Timing</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentStep === 1) handleNextStep1();
                else handleNextStep2();
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all ${
                currentStep === 3
                  ? "bg-[#001232] text-white shadow-xs"
                  : "text-gray-600 hover:text-[#001232] hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  currentStep === 3
                    ? "bg-[#FFB902] text-[#001232]"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                3
              </span>
              <span className="truncate">
                Questions <span className="hidden sm:inline">({questions.length})</span>
              </span>
            </button>
          </div>
        </div>
        
        {/* ==============================================
            PAGE 1: GENERAL INFORMATION
           ============================================== */}
        {currentStep === 1 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-[#001232]">Step 1: General Details</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select the course and set examination title</p>
            </div>

            {/* Course / Program */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Program / Course *
              </label>
              <select
                value={selectedProgramId}
                onChange={e => setSelectedProgramId(e.target.value)}
                required
                className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              >
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.titleEn}</option>
                ))}
              </select>
            </div>

            {/* Exam Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Examination Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Midterm Assessment: Tuhfat al-Atfal"
                required
                className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief summary of exam scope..."
                rows={2}
                className="w-full text-sm font-medium bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Candidate Instructions (Displayed before student begins)
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                className="w-full text-sm font-medium bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              />
            </div>

            {/* Bottom Actions for Step 1 */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="text-xs font-bold text-gray-500 hover:text-[#001232] flex items-center gap-1"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#FFB902]" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep1}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all"
              >
                <span>Next: Timing & Schedule</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==============================================
            PAGE 2: SCHEDULING & TIMING
           ============================================== */}
        {currentStep === 2 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-[#001232]">Step 2: Scheduling & Timing</h2>
              <p className="text-xs text-gray-500 mt-0.5">Configure access window, timer, and score ceiling</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Availability Starts At *
                  </label>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    WAT (West Africa Time / UTC+1)
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  required
                  className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
                <p className="text-[11px] text-gray-400 mt-1">When candidates can first open the exam in West Africa Time (e.g. 08:30 AM).</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Availability Closes At *
                  </label>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    WAT (West Africa Time / UTC+1)
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  required
                  className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
                <p className="text-[11px] text-gray-400 mt-1">When exam closes for all candidates in West Africa Time (e.g. 08:00 PM).</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Duration (Mins) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={durationMinutes}
                    onChange={e => {
                      const val = e.target.value;
                      setDurationMinutes(val === "" ? "" : Number(val));
                    }}
                    onBlur={() => {
                      if (!durationMinutes || Number(durationMinutes) <= 0) {
                        setDurationMinutes(45);
                      }
                    }}
                    required
                    className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Student timer countdown.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Marks / Question
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={markPerQuestion}
                    onChange={e => {
                      const val = e.target.value;
                      const nextVal = val === "" ? "" : Number(val);
                      setMarkPerQuestion(nextVal);
                      if (typeof nextVal === "number" && nextVal > 0) {
                        setQuestions(prev => prev.map(q => ({ ...q, marks: nextVal })));
                      }
                    }}
                    onBlur={() => {
                      if (!markPerQuestion || Number(markPerQuestion) <= 0) {
                        setMarkPerQuestion(2);
                        setQuestions(prev => prev.map(q => ({ ...q, marks: 2 })));
                      }
                    }}
                    className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Default points per MCQ.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target Total
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={e => {
                      const val = e.target.value;
                      setTotalMarks(val === "" ? "" : Number(val));
                    }}
                    onBlur={() => {
                      if (!totalMarks || Number(totalMarks) <= 0) {
                        const perQ = Number(markPerQuestion) || 2;
                        setTotalMarks(questions.length * perQ);
                      }
                    }}
                    className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">e.g. 60 marks total.</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions for Step 2 */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-[#001232]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to General</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep2}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all"
              >
                <span>Next: Questions ({questions.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==============================================
            PAGE 3: QUESTIONS & ANSWERS EDITOR (DEDICATED)
           ============================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in w-full max-w-full box-border">
            {/* Header with Add & Draft Buttons */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#001232]">
                  Step 3: Questions & Answers ({questions.length})
                </h2>
                <p className="text-xs text-gray-500">
                  Tap option pill (A-D) to set correct answer
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-[#001232] text-xs font-bold rounded-xl transition-colors"
                >
                  {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5 text-amber-500" />}
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#001232] text-[#FFB902] hover:bg-[#002255] text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List (Mobile-Optimized Layout Without Horizontal Swapping) */}
            <div className="space-y-4 w-full max-w-full box-border">
              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 w-full max-w-full box-border overflow-hidden"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#001232] text-[#FFB902] font-black text-xs flex items-center justify-center shrink-0">
                        {q.order}
                      </span>
                      <span className="text-sm font-bold text-[#001232]">Question {q.order}</span>
                      <span className="text-xs text-gray-400 font-medium">({q.marks} mark{q.marks > 1 ? "s" : ""})</span>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition-colors shrink-0"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Question Text with Arabic Font & Zero Overflow */}
                  <div className="w-full max-w-full box-border">
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Question Stem (English / Arabic with Tashkeel) *
                    </label>
                    <textarea
                      dir="auto"
                      value={q.questionText}
                      onChange={e => handleQuestionChange(qIndex, "questionText", e.target.value)}
                      placeholder="Enter question text here... / اَكْتُبِ السُّؤَالَ هُنَا"
                      rows={2}
                      required
                      className="w-full max-w-full box-border text-base font-amiri font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-[#001232] focus:outline-none focus:border-[#001232] leading-relaxed resize-y"
                    />
                  </div>

                  {/* Options A, B, C, D (Flex with min-w-0 to prevent mobile overflow) */}
                  <div className="space-y-2 pt-1 w-full max-w-full box-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600">Options</span>
                      <span className="text-[11px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                        Correct: Option [{q.correctOption}]
                      </span>
                    </div>

                    {(["A", "B", "C", "D"] as const).map(optKey => {
                      const fieldKey = `option${optKey}` as "optionA" | "optionB" | "optionC" | "optionD";
                      const isCorrect = q.correctOption === optKey;

                      return (
                        <div key={optKey} className="flex items-center gap-2 w-full max-w-full min-w-0 box-border">
                          {/* Option Toggle Pill */}
                          <button
                            type="button"
                            onClick={() => handleQuestionChange(qIndex, "correctOption", optKey)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 transition-all ${
                              isCorrect
                                ? "bg-green-600 text-white ring-2 ring-green-600 shadow-xs"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            title={`Mark Option ${optKey} as Correct`}
                          >
                            {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : optKey}
                          </button>

                          {/* Option Text Input */}
                          <input
                            dir="auto"
                            type="text"
                            value={q[fieldKey]}
                            onChange={e => handleQuestionChange(qIndex, fieldKey, e.target.value)}
                            placeholder={`Option ${optKey}...`}
                            required
                            className={`flex-1 min-w-0 w-full box-border text-sm font-amiri font-medium bg-[#f8fafc] border rounded-xl px-3 py-2 text-[#001232] focus:outline-none transition-colors ${
                              isCorrect
                                ? "border-green-400 bg-green-50/20"
                                : "border-gray-200 focus:border-[#001232]"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Next Question */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3.5 border-2 border-dashed border-gray-300 hover:border-[#001232] rounded-2xl text-gray-600 hover:text-[#001232] font-black text-sm flex items-center justify-center gap-2 transition-colors bg-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question ({questions.length + 1})</span>
              </button>
            </div>

            {/* Final Action Bar for Step 3 */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center justify-center gap-1 text-xs font-bold text-gray-600 hover:text-[#001232] py-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Timing</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 text-center"
                >
                  {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={handlePublishExam}
                  disabled={isPublishing}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-black text-xs sm:text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Publish Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function CreateExaminationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-500 mt-3">Loading exam builder...</p>
      </div>
    }>
      <CreateExamWizard />
    </Suspense>
  );
}
