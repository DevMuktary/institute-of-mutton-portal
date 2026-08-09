"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, Users, ArrowLeft, X, 
  CheckCircle2, AlertCircle, Info, CalendarDays, ArrowRight, Save
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  maxDailyMark: number;
}

interface Student {
  id: string;
  fullName: string;
  studentUniqueId: string;
}

interface MarkEntry {
  score: string | number;
  notes: string;
}

// Custom Toast
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

export default function TeacherDailyRegister() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Register State
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [marksData, setMarksData] = useState<Record<string, MarkEntry>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  // Load Programs
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

  // Load Students and Existing Marks when Program or Day changes
  useEffect(() => {
    if (!selectedProgram) return;
    
    const fetchClassData = async () => {
      setIsStudentsLoading(true);
      try {
        // 1. Fetch Students
        const resStudents = await fetch(`/api/teacher/dashboard?programId=${selectedProgram.id}`);
        const jsonStudents = await resStudents.json();
        
        // 2. Fetch Existing Marks for this Day
        const resMarks = await fetch(`/api/teacher/marks/bulk?programId=${selectedProgram.id}&dayNumber=${selectedDay}`);
        const jsonMarks = await resMarks.json();

        if (resStudents.ok && resMarks.ok) {
          setStudents(jsonStudents.data);
          
          // Map existing marks into the state
          const marksMap: Record<string, MarkEntry> = {};
          jsonMarks.data.forEach((mark: any) => {
            marksMap[mark.studentId] = { score: mark.score, notes: mark.notes || "" };
          });
          setMarksData(marksMap);
        }
      } catch (err) {
        console.error("Failed to load class data");
      } finally {
        setIsStudentsLoading(false);
      }
    };
    fetchClassData();
  }, [selectedProgram, selectedDay]);

  const handleMarkChange = (studentId: string, field: "score" | "notes", value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedProgram) return;
    setIsSaving(true);

    // Filter out empty scores
    const payloadMarks = Object.entries(marksData)
      .filter(([_, data]) => data.score !== "" && data.score !== undefined)
      .map(([studentId, data]) => ({
        studentId,
        score: data.score,
        notes: data.notes
      }));

    if (payloadMarks.length === 0) {
      setToastType("info");
      setToastMessage("No marks entered to save.");
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/teacher/marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgram.id,
          dayNumber: selectedDay,
          marks: payloadMarks
        })
      });

      if (!res.ok) throw new Error();
      
      setToastType("success");
      setToastMessage(`Day ${selectedDay} marks saved successfully!`);
    } catch (err) {
      setToastType("error");
      setToastMessage("Failed to save marks. Check connection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full font-sans relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

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
          /* View 1: Program Selection */
          <div className="flex flex-col min-w-0">
            <div className="mb-8 flex items-center space-x-3">
              <div className="p-3 bg-[#001232]/5 rounded-xl text-[#001232]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight">Daily Register</h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium">Select a program below to log bulk marks.</p>
              </div>
            </div>

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
                  <p className="text-sm font-semibold text-gray-500 flex-grow">Max Score: {program.maxDailyMark}</p>
                  <div className="mt-6 flex items-center text-[#FFB902] font-bold text-sm">
                    Open Register <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* View 2: Spreadsheet Register */
          <div className="flex flex-col min-w-0">
            
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <button 
                  onClick={() => { setSelectedProgram(null); setMarksData({}); }}
                  className="flex items-center text-sm font-bold text-gray-400 hover:text-[#001232] transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Change Program
                </button>
                <h1 dir="auto" className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight leading-snug break-words">
                  {selectedProgram.titleEn}
                </h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium flex items-center">
                  <Users className="w-4 h-4 mr-1.5" /> Master Register
                </p>
              </div>

              {/* Day Selector & Save Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                  <label className="text-sm font-bold text-gray-500 mr-3">Day</label>
                  <input 
                    type="number" 
                    min="1"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value) || 1)}
                    className="w-16 text-lg font-extrabold text-[#001232] bg-transparent outline-none text-center"
                  />
                </div>
                
                <button 
                  onClick={handleSaveAll}
                  disabled={isSaving || isStudentsLoading}
                  className="flex items-center px-6 py-3.5 bg-[#001232] text-white rounded-xl font-bold hover:bg-[#001232]/90 transition-all shadow-md disabled:opacity-70"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> Save Marks</>
                  )}
                </button>
              </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isStudentsLoading ? (
                <div className="p-16 flex justify-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="p-16 text-center">
                  <h3 className="text-xl font-bold text-[#001232] mb-2">No Students Enrolled</h3>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Student Name</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Student ID</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Score (Max: {selectedProgram.maxDailyMark})</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignment / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <p dir="auto" className="font-extrabold text-[#001232] text-[15px]">{student.fullName}</p>
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-500">
                            {student.studentUniqueId || "Pending ID"}
                          </td>
                          <td className="p-4">
                            <input 
                              type="number"
                              min="0"
                              max={selectedProgram.maxDailyMark}
                              step="0.5"
                              value={marksData[student.id]?.score ?? ""}
                              onChange={(e) => handleMarkChange(student.id, "score", e.target.value)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] outline-none font-bold text-[#001232] text-center"
                              placeholder="0.0"
                            />
                          </td>
                          <td className="p-4">
                            <input 
                              type="text"
                              value={marksData[student.id]?.notes ?? ""}
                              onChange={(e) => handleMarkChange(student.id, "notes", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB902] outline-none text-sm text-[#001232]"
                              placeholder="e.g. Surat Al-Baqarah, Ayah 1-10"
                              dir="auto"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Save Button (For long lists) */}
            {students.length > 5 && !isStudentsLoading && (
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center px-8 py-4 bg-[#001232] text-white rounded-xl font-bold hover:bg-[#001232]/90 transition-all shadow-md disabled:opacity-70"
                >
                  <Save className="w-5 h-5 mr-2" /> Save Day {selectedDay} Marks
                </button>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="w-full py-8 border-t border-gray-200 bg-white text-center shrink-0 mt-auto">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()} Quadrox Technologies Limited
        </p>
      </footer>
    </div>
  );
}