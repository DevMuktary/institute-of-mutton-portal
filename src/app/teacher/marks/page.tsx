"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, Users, Edit3, ArrowLeft, X, 
  CheckCircle2, AlertCircle, Info, CalendarDays, ArrowRight
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  slug: string;
  maxDailyMark: number;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

// Custom Toast Component
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" | "info" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    error: { border: "border-red-500", text: "text-red-800", iconText: "text-red-500", icon: AlertCircle },
    success: { border: "border-green-500", text: "text-green-800", iconText: "text-green-500", icon: CheckCircle2 },
    info: { border: "border-blue-500", text: "text-blue-800", iconText: "text-blue-500", icon: Info },
  };
  const currentStyle = styles[type];
  const Icon = currentStyle.icon;

  return (
    <div className="fixed top-24 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-2xl rounded-r-xl p-4 flex items-start w-80 max-w-full ${currentStyle.border}`}>
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-5 w-5 ${currentStyle.iconText}`} />
        </div>
        <div className="ml-3 w-full">
          <p className={`text-sm font-semibold break-words ${currentStyle.text}`}>{message}</p>
        </div>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${currentStyle.iconText} hover:opacity-70 transition-opacity`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function TeacherMarksModule() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  
  // Modal State
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [markLabel, setMarkLabel] = useState("");
  const [markScore, setMarkScore] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  // Load Programs on Mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/teacher/dashboard");
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) router.push("/login");
          return;
        }
        const json = await res.json();
        setPrograms(json.data);
      } catch (err) {
        console.error("Failed to load programs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, [router]);

  // Load Students when a Program is selected
  useEffect(() => {
    if (!selectedProgram) return;
    
    const fetchStudents = async () => {
      setIsStudentsLoading(true);
      try {
        const res = await fetch(`/api/teacher/dashboard?programId=${selectedProgram.id}`);
        const json = await res.json();
        if (res.ok) {
          setStudents(json.data);
        }
      } catch (err) {
        console.error("Failed to load students");
      } finally {
        setIsStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [selectedProgram]);

  const handleMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudent || !selectedProgram) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teacher/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: modalStudent.id,
          programId: selectedProgram.id,
          dayLabel: markLabel,
          score: markScore
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setToastType("error");
        setToastMessage(data.error || "Failed to log mark.");
      } else {
        setToastType("success");
        setToastMessage(`Mark logged successfully for ${modalStudent.fullName.split(' ')[0]}!`);
        setModalStudent(null);
        setMarkLabel("");
        setMarkScore("");
      }
    } catch (err) {
      setToastType("error");
      setToastMessage("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full overflow-x-hidden font-sans relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Log Mark Modal */}
      {modalStudent && selectedProgram && (
        <div className="fixed inset-0 z-[9999] bg-[#001232]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-fade-in-down border border-gray-100">
            <button 
              onClick={() => { setModalStudent(null); setMarkLabel(""); setMarkScore(""); }} 
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#001232]/5 text-[#001232] flex items-center justify-center shrink-0 border border-[#001232]/10">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#001232] tracking-tight leading-none">Log Daily Mark</h2>
                <p className="text-gray-500 text-sm mt-1 truncate max-w-[200px]" dir="auto">{modalStudent.fullName}</p>
              </div>
            </div>
            
            <form onSubmit={handleMarkSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-[#001232] mb-1.5">Assignment / Day Label</label>
                <input 
                  type="text" 
                  required 
                  value={markLabel} 
                  onChange={(e) => setMarkLabel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none text-[15px] text-[#001232] bg-gray-50"
                  placeholder="e.g., Surat Al-Baqarah, Ayah 1-10" 
                  dir="auto"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-[#001232]">Score</label>
                  <span className="text-xs font-bold text-[#FFB902] bg-[#FFB902]/10 px-2 py-0.5 rounded-md">
                    Max: {selectedProgram.maxDailyMark}
                  </span>
                </div>
                <input 
                  type="number" 
                  required 
                  min="0"
                  max={selectedProgram.maxDailyMark}
                  step="0.5"
                  value={markScore} 
                  onChange={(e) => setMarkScore(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none text-[15px] text-[#001232] bg-gray-50 font-bold"
                  placeholder="Enter numerical score" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#001232] text-white font-bold py-3.5 rounded-xl hover:bg-[#001232]/90 transition-all shadow-md hover:shadow-lg disabled:opacity-70 mt-2"
              >
                {isSubmitting ? "Saving..." : "Save Mark"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              href="/teacher"
              className="flex items-center text-sm font-bold text-gray-500 hover:text-[#001232] transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Hub</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {!selectedProgram ? (
          /* View 1: Program Selection Grid */
          <div className="flex flex-col min-w-0">
            <div className="mb-8 flex items-center space-x-3">
              <div className="p-3 bg-[#001232]/5 rounded-xl text-[#001232]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight">Daily Marks Module</h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium">Select a program below to access the student roster.</p>
              </div>
            </div>

            {programs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-[#001232] mb-2">No Programs Available</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {programs.map((program) => (
                  <div 
                    key={program.id}
                    onClick={() => setSelectedProgram(program)}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#FFB902] hover:shadow-lg transition-all cursor-pointer flex flex-col h-full group"
                  >
                    <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mb-4 border border-gray-100 group-hover:bg-[#001232] group-hover:text-[#FFB902] group-hover:border-[#001232] transition-all">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 dir="auto" className="text-[17px] font-bold text-[#001232] mb-2 break-words">{program.titleEn}</h3>
                    <p className="text-sm font-semibold text-gray-500 flex-grow">Max Mark: {program.maxDailyMark}</p>
                    <div className="mt-6 flex items-center text-[#FFB902] font-bold text-sm">
                      Open Roster <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* View 2: Student Roster */
          <div className="flex flex-col min-w-0">
            
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button 
                  onClick={() => setSelectedProgram(null)}
                  className="flex items-center text-sm font-bold text-gray-400 hover:text-[#001232] transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Select a different program
                </button>
                <h1 dir="auto" className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight leading-snug break-words">
                  {selectedProgram.titleEn}
                </h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium flex items-center">
                  <Users className="w-4 h-4 mr-1.5" /> Enrolled Students
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              {isStudentsLoading ? (
                <div className="p-16 flex justify-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                    <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#001232] mb-2">No Active Students</h3>
                  <p className="text-gray-500 text-[15px] max-w-sm">There are currently no approved students enrolled in this program.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Details</th>
                          <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                          <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-6">
                              <p dir="auto" className="font-extrabold text-[#001232] text-[16px]">{student.fullName}</p>
                              <p className="text-sm font-medium text-gray-500 mt-0.5">{student.email}</p>
                            </td>
                            <td className="p-6 text-[15px] font-semibold text-gray-600">{student.phoneNumber}</td>
                            <td className="p-6 text-right">
                              <button 
                                onClick={() => setModalStudent(student)}
                                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 text-[#001232] hover:bg-[#001232] hover:text-[#FFB902] hover:border-[#001232] rounded-xl font-bold text-sm transition-all shadow-sm"
                              >
                                <Edit3 className="w-4 h-4 mr-2" /> Log Mark
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="sm:hidden flex flex-col divide-y divide-gray-50">
                    {students.map((student) => (
                      <div key={student.id} className="p-6 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
                        <div>
                          <p dir="auto" className="font-extrabold text-[#001232] text-[17px]">{student.fullName}</p>
                          <p className="text-sm font-medium text-gray-500 mt-1">{student.email}</p>
                          <p className="text-sm font-semibold text-gray-600 mt-0.5">{student.phoneNumber}</p>
                        </div>
                        <button 
                          onClick={() => setModalStudent(student)}
                          className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 border border-gray-200 text-[#001232] active:bg-[#001232] active:text-[#FFB902] rounded-xl font-bold text-[15px] transition-all shadow-sm"
                        >
                          <Edit3 className="w-4 h-4 mr-2" /> Log Mark
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="w-full py-8 border-t border-gray-200 bg-white text-center shrink-0 mt-auto">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-bold text-[#001232] hover:text-[#FFB902] transition-colors">
            Quadrox Technologies Limited
          </a>
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}