"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, Users, ArrowLeft, X, 
  CheckCircle2, AlertCircle, Info, CalendarDays, ArrowRight, Save, LayoutGrid, Download
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  slug: string;
  maxDailyMark: number;
}

interface DailyMark {
  dayNumber: number;
  score: number;
  notes: string | null;
}

interface Student {
  id: string;
  fullName: string;
  studentUniqueId: string;
  dailyMarks?: DailyMark[];
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

export default function TeacherMarksModule() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  const [activeTab, setActiveTab] = useState<"ENTRY" | "MATRIX">("ENTRY");

  // Daily Entry State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [marksData, setMarksData] = useState<Record<string, MarkEntry>>({});
  
  // Matrix State
  const [matrixStudents, setMatrixStudents] = useState<Student[]>([]);
  const [matrixMaxDay, setMatrixMaxDay] = useState<number>(0);

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

  // Load Data based on active tab
  useEffect(() => {
    if (!selectedProgram) return;
    
    const fetchData = async () => {
      setIsStudentsLoading(true);
      try {
        if (activeTab === "ENTRY") {
          const resStudents = await fetch(`/api/teacher/dashboard?programId=${selectedProgram.id}`);
          const resMarks = await fetch(`/api/teacher/marks/bulk?programId=${selectedProgram.id}&dayNumber=${selectedDay}`);
          
          if (resStudents.ok && resMarks.ok) {
            const jsonStudents = await resStudents.json();
            const jsonMarks = await resMarks.json();
            
            setStudents(jsonStudents.data);
            const marksMap: Record<string, MarkEntry> = {};
            jsonMarks.data.forEach((mark: any) => {
              marksMap[mark.studentId] = { score: mark.score, notes: mark.notes || "" };
            });
            setMarksData(marksMap);
          }
        } else {
          // Fetch Matrix Data
          const resMatrix = await fetch(`/api/teacher/marks/matrix?programId=${selectedProgram.id}`);
          if (resMatrix.ok) {
            const jsonMatrix = await resMatrix.json();
            setMatrixStudents(jsonMatrix.data.students);
            setMatrixMaxDay(jsonMatrix.data.maxDay);
          }
        }
      } catch (err) {
        console.error("Failed to load class data");
      } finally {
        setIsStudentsLoading(false);
      }
    };
    fetchData();
  }, [selectedProgram, selectedDay, activeTab]);

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

  // Helper to generate CSV
  const exportMatrixToCSV = () => {
    if (!selectedProgram || matrixStudents.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Build Headers
    const headers = ["Student Name", "Student ID"];
    for (let i = 1; i <= matrixMaxDay; i++) headers.push(`Day ${i}`);
    headers.push("Total Score");
    csvContent += headers.join(",") + "\n";

    // Build Rows
    matrixStudents.forEach(student => {
      const row = [student.fullName, student.studentUniqueId || "N/A"];
      let total = 0;
      
      for (let i = 1; i <= matrixMaxDay; i++) {
        const mark = student.dailyMarks?.find(m => m.dayNumber === i);
        if (mark) {
          row.push(mark.score.toString());
          total += mark.score;
        } else {
          row.push("-");
        }
      }
      row.push(total.toString());
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedProgram.slug}_gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-w-0">
        
        {!selectedProgram ? (
          /* View 1: Program Selection */
          <div className="flex flex-col min-w-0 max-w-5xl mx-auto w-full">
            <div className="mb-8 flex items-center space-x-3">
              <div className="p-3 bg-[#001232]/5 rounded-xl text-[#001232]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001232] tracking-tight">Gradebook & Marks</h1>
                <p className="text-gray-500 mt-1 text-[15px] font-medium">Select a program below to log marks or view the master matrix.</p>
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* View 2: Register/Matrix Tabs */
          <div className="flex flex-col min-w-0">
            
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
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
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-gray-200/50 p-1 rounded-xl shrink-0 self-start md:self-end">
                <button 
                  onClick={() => setActiveTab("ENTRY")}
                  className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "ENTRY" ? "bg-white text-[#001232] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <CalendarDays className="w-4 h-4 mr-2" /> Daily Entry
                </button>
                <button 
                  onClick={() => setActiveTab("MATRIX")}
                  className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "MATRIX" ? "bg-[#001232] text-[#FFB902] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" /> Master Gradebook
                </button>
              </div>
            </div>

            {/* --- TAB 1: DAILY ENTRY --- */}
            {activeTab === "ENTRY" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                    <label className="text-sm font-bold text-gray-500 mr-3">Select Day</label>
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
                    className="flex items-center px-6 py-2.5 bg-[#001232] text-white rounded-xl font-bold hover:bg-[#001232]/90 transition-all shadow-md disabled:opacity-70"
                  >
                    {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Marks</>}
                  </button>
                </div>

                {isStudentsLoading ? (
                  <div className="p-16 flex justify-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Student Name</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Student ID</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Score (Max: {selectedProgram.maxDailyMark})</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignment / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-extrabold text-[#001232] text-[15px]">{student.fullName}</td>
                            <td className="p-4 text-sm font-medium text-gray-500">{student.studentUniqueId || "Pending"}</td>
                            <td className="p-4">
                              <input 
                                type="number"
                                min="0" max={selectedProgram.maxDailyMark} step="0.5"
                                value={marksData[student.id]?.score ?? ""}
                                onChange={(e) => handleMarkChange(student.id, "score", e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] outline-none font-bold text-[#001232] text-center"
                              />
                            </td>
                            <td className="p-4">
                              <input 
                                type="text"
                                value={marksData[student.id]?.notes ?? ""}
                                onChange={(e) => handleMarkChange(student.id, "notes", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB902] outline-none text-sm text-[#001232]"
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
            )}

            {/* --- TAB 2: MASTER GRADEBOOK MATRIX --- */}
            {activeTab === "MATRIX" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                  <p className="text-sm font-bold text-gray-500">Holistic view of all logged days.</p>
                  <button 
                    onClick={exportMatrixToCSV}
                    className="flex items-center px-5 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export to CSV
                  </button>
                </div>

                {isStudentsLoading ? (
                  <div className="p-16 flex justify-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-center border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/95 shadow-[1px_0_0_0_#e5e7eb]">Student Name</th>
                          {Array.from({ length: matrixMaxDay }).map((_, i) => (
                            <th key={i} className="p-4 text-xs font-bold text-[#001232] uppercase tracking-wider border-l border-gray-100 min-w-[80px]">
                              Day {i + 1}
                            </th>
                          ))}
                          <th className="p-4 text-xs font-extrabold text-[#FFB902] uppercase tracking-wider border-l border-gray-200 bg-[#001232]/5">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matrixStudents.map((student) => {
                          let totalScore = 0;
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 text-left font-extrabold text-[#001232] text-[14px] sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] truncate max-w-[200px]" dir="auto">
                                {student.fullName}
                              </td>
                              {Array.from({ length: matrixMaxDay }).map((_, i) => {
                                const mark = student.dailyMarks?.find(m => m.dayNumber === i + 1);
                                if (mark) totalScore += mark.score;
                                return (
                                  <td key={i} className="p-4 text-sm font-semibold text-gray-600 border-l border-gray-50">
                                    {mark ? (
                                      <span className={mark.score < (selectedProgram.maxDailyMark / 2) ? "text-red-500" : ""}>{mark.score}</span>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-4 text-[15px] font-extrabold text-[#001232] border-l border-gray-200 bg-[#001232]/5">
                                {totalScore}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}