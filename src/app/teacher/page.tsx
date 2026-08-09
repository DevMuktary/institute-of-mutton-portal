"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  BookOpen, LogOut, User, CheckCircle2, AlertCircle, 
  ArrowLeft, Info, ChevronDown, X, Users, Edit3
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
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

export default function TeacherPortal() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          if (res.status === 401 || res.status === 403) {
             router.push("/login");
          }
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

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
        setToastMessage(`Mark logged for ${modalStudent.fullName.split(' ')[0]}!`);
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-fade-in-down border border-gray-100">
            <button 
              onClick={() => { setModalStudent(null); setMarkLabel(""); setMarkScore(""); }} 
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-extrabold text-[#001232] mb-1 tracking-tight">Log Daily Mark</h2>
            <p className="text-gray-500 text-sm mb-6 truncate" dir="auto">Student: <strong>{modalStudent.fullName}</strong></p>
            
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
                <label className="block text-sm font-bold text-[#001232] mb-1.5">Score (Out of {selectedProgram.maxDailyMark})</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  max={selectedProgram.maxDailyMark}
                  step="0.5"
                  value={markScore} 
                  onChange={(e) => setMarkScore(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none text-[15px] text-[#001232] bg-gray-50 font-bold"
                  placeholder="Enter score" 
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

      {/* Premium Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                <Image src="/mutoon-logo.png" alt="Logo" width={28} height={28} className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[#001232] text-[16px] sm:text-lg tracking-tight leading-none">Institute of Mutoon</span>
                <span className="text-xs font-bold text-[#FFB902] uppercase tracking-wider mt-0.5">Teacher Portal</span>
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">
                <div className="h-10 w-10 rounded-full bg-[#001232] flex items-center justify-center text-[#FFB902] shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center transition-colors">
                    <LogOut className="w-4 h-4 mr-3 text-red-500" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {!selectedProgram ? (
          /* View 1: Program Selection Grid */
          <div className="flex flex-col min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight">Select a Program</h1>
              <p className="text-gray-500 mt-1 text-[15px] font-medium">Choose a program below to view students and log marks.</p>
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
                    <div className="w-12 h-12 bg-[#001232]/5 text-[#001232] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#001232] group-hover:text-[#FFB902] transition-colors">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 dir="auto" className="text-[17px] font-bold text-[#001232] mb-2 break-words">{program.titleEn}</h3>
                    <p className="text-sm font-semibold text-gray-500 flex-grow">Max Daily Mark: {program.maxDailyMark}</p>
                    <div className="mt-6 flex items-center text-[#FFB902] font-bold text-sm">
                      View Roster <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
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
                  className="flex items-center text-sm font-bold text-gray-500 hover:text-[#001232] transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Programs
                </button>
                <h1 dir="auto" className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight leading-snug break-words">
                  {selectedProgram.titleEn}
                </h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium flex items-center">
                  <Users className="w-4 h-4 mr-1.5" /> Enrolled Students
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {isStudentsLoading ? (
                <div className="p-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <Users className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-[#001232] mb-2">No Active Students</h3>
                  <p className="text-gray-500 text-sm">There are no approved students in this program yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                          <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-5">
                              <p dir="auto" className="font-bold text-[#001232] text-[15px]">{student.fullName}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{student.phoneNumber}</p>
                            </td>
                            <td className="p-5 text-sm font-medium text-gray-600">{student.email}</td>
                            <td className="p-5 text-right">
                              <button 
                                onClick={() => setModalStudent(student)}
                                className="inline-flex items-center px-4 py-2 bg-[#FFB902]/10 text-[#001232] hover:bg-[#FFB902] hover:text-white rounded-lg font-bold text-sm transition-colors"
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
                  <div className="sm:hidden flex flex-col divide-y divide-gray-100">
                    {students.map((student) => (
                      <div key={student.id} className="p-5 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p dir="auto" className="font-bold text-[#001232] text-[16px]">{student.fullName}</p>
                            <p className="text-sm font-medium text-gray-500 mt-0.5">{student.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setModalStudent(student)}
                          className="w-full flex items-center justify-center px-4 py-2.5 bg-[#FFB902]/10 text-[#001232] active:bg-[#FFB902] active:text-white rounded-xl font-bold text-sm transition-colors mt-1"
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