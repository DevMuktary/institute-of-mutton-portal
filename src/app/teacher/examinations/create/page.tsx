"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle,
  Save, Loader2, Clock, Calendar, Check, HelpCircle
} from "lucide-react";

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

export default function CreateExaminationPage() {
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "1. Ensure you have a stable internet connection.\n2. Do NOT minimize this window or switch browser tabs.\n3. Your countdown timer cannot be paused once started."
  );

  // Time & Duration
  // Default start: today at 08:00 AM, end: today at 08:00 PM
  const getTodayTimeString = (hours: number, minutes: number = 0) => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [startsAt, setStartsAt] = useState(getTodayTimeString(8, 0));
  const [endsAt, setEndsAt] = useState(getTodayTimeString(20, 0));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [markPerQuestion, setMarkPerQuestion] = useState(2);
  const [totalMarks, setTotalMarks] = useState(60);

  // Questions array
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/teacher/dashboard");
        if (res.ok) {
          const json = await res.json();
          setPrograms(json.data || []);
          if (json.data?.length > 0) {
            setSelectedProgramId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load programs:", err);
      }
    };
    fetchPrograms();
  }, []);

  // Update total marks whenever markPerQuestion or questions count changes
  useEffect(() => {
    setTotalMarks(questions.length * markPerQuestion);
  }, [questions.length, markPerQuestion]);

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
        marks: markPerQuestion
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProgramId) {
      return setToast({ msg: "Please select a program.", type: "error" });
    }
    if (!title.trim()) {
      return setToast({ msg: "Please enter an examination title.", type: "error" });
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return setToast({ msg: "End time must be after the start time.", type: "error" });
    }

    // Validate that questions have stems and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        return setToast({ msg: `Question ${i + 1} text cannot be empty.`, type: "error" });
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        return setToast({ msg: `Please fill all 4 options (A, B, C, D) for Question ${i + 1}.`, type: "error" });
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgramId,
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          startsAt,
          endsAt,
          durationMinutes: Number(durationMinutes),
          markPerQuestion: Number(markPerQuestion),
          totalMarks: Number(totalMarks),
          questions
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create examination.");
      }

      setToast({ msg: "Examination created and published successfully!", type: "success" });
      setTimeout(() => {
        router.push("/teacher/examinations");
      }, 1000);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to save examination.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
          <div className={`bg-white border-l-4 shadow-xl rounded-r-xl p-3 flex items-center gap-3 w-80 max-w-full ${toast.type === "success" ? "border-green-500 text-green-800" : "border-red-500 text-red-800"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <p className="text-sm font-semibold">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* Sticky Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link href="/teacher/examinations" className="p-2 -ml-2 text-gray-500 hover:text-[#001232] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <Image src="/mutoon-logo.png" alt="Logo" width={24} height={24} className="object-contain" priority />
              <span className="font-extrabold text-[#001232] text-lg">Create Exam</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#001232] hover:bg-[#002255] text-[#FFB902] text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save & Publish</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Card 1: Program & General Details */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-[#001232] border-b border-gray-100 pb-2">
              1. General Information
            </h2>

            {/* Program Selection */}
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
                placeholder="Brief summary of exam scope or topics covered..."
                rows={2}
                className="w-full text-sm font-medium bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Candidate Instructions (Displayed before exam start)
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                className="w-full text-sm font-medium bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
              />
            </div>
          </div>

          {/* Card 2: Schedule & Time Window */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-[#001232] border-b border-gray-100 pb-2">
              2. Scheduling & Timing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Availability Starts At *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    required
                    className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">When students can first access the exam.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Availability Closes At *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    required
                    className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">After this time, the exam is locked.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  required
                  className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Student timer once started.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Marks Per Question
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={markPerQuestion}
                  onChange={e => {
                    const m = Number(e.target.value);
                    setMarkPerQuestion(m);
                    setQuestions(prev => prev.map(q => ({ ...q, marks: m })));
                  }}
                  className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Default mark per MCQ.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Total Marks Ceiling
                </label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={e => setTotalMarks(Number(e.target.value))}
                  className="w-full text-sm font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232]"
                />
                <p className="text-[11px] text-gray-400 mt-1">e.g. 60 marks total.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Objective Questions Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#001232]">
                  3. Objective Questions ({questions.length})
                </h2>
                <p className="text-xs text-gray-500">
                  Supports clear Arabic Mutoon fonts & diacritics. Tap option pill to select correct answer.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {/* Questions List */}
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 relative group"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#001232] text-[#FFB902] font-bold text-xs flex items-center justify-center">
                      {q.order}
                    </span>
                    <span className="text-sm font-bold text-[#001232]">Question {q.order}</span>
                    <span className="text-xs text-gray-400 font-medium">({q.marks} mark{q.marks > 1 ? "s" : ""})</span>
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                      title="Remove Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Question Text with Arabic Font */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Question Stem (English or Arabic with Tashkeel) *
                  </label>
                  <textarea
                    dir="auto"
                    value={q.questionText}
                    onChange={e => handleQuestionChange(qIndex, "questionText", e.target.value)}
                    placeholder="Enter question here... / اَكْتُبِ السُّؤَالَ هُنَا"
                    rows={2}
                    required
                    className="w-full text-base font-amiri font-semibold bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-[#001232] focus:outline-none focus:border-[#001232] leading-relaxed"
                  />
                </div>

                {/* Options A, B, C, D */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Answer Options</span>
                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                      Tap letter to set correct answer: [{q.correctOption}]
                    </span>
                  </div>

                  {(["A", "B", "C", "D"] as const).map(optKey => {
                    const fieldKey = `option${optKey}` as "optionA" | "optionB" | "optionC" | "optionD";
                    const isCorrect = q.correctOption === optKey;

                    return (
                      <div key={optKey} className="flex items-center gap-2">
                        {/* Option Select Button */}
                        <button
                          type="button"
                          onClick={() => handleQuestionChange(qIndex, "correctOption", optKey)}
                          className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 transition-all ${
                            isCorrect
                              ? "bg-green-600 text-white ring-2 ring-green-600 shadow-sm"
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
                          className={`flex-grow text-sm font-amiri font-medium bg-[#f8fafc] border rounded-xl px-3.5 py-2 text-[#001232] focus:outline-none transition-colors ${
                            isCorrect
                              ? "border-green-400 bg-green-50/30"
                              : "border-gray-200 focus:border-[#001232]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Bottom Add Question Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-[#001232] rounded-2xl text-gray-600 hover:text-[#001232] font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-white/50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Next Question ({questions.length + 1})</span>
              </button>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <Link
              href="/teacher/examinations"
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#001232] hover:bg-[#002255] text-[#FFB902] font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Exam...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Examination</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
