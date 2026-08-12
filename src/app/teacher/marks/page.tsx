"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  BookOpen, ArrowLeft, X, CheckCircle2, AlertCircle, Info, FileText, Loader2, Save
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
}

// --- 1. Custom Toast Component ---
const Toast = ({ message, onClose, type = "error" }: { message: string, onClose: () => void, type?: "error" | "success" | "info" }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
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
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${currentStyle.iconText}`} />
        <p className={`ml-3 text-sm font-semibold break-words w-full ${currentStyle.text}`}>{message}</p>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${currentStyle.iconText} hover:opacity-70`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// --- 2. Isolated Row Component for Auto-Save ---
const StudentMarkRow = memo(({ 
  student, programId, dayNumber, maxMark, initialScore, onSaveSingle
}: { 
  student: Student, programId: string, dayNumber: number, maxMark: number, 
  initialScore: string, onSaveSingle: (studentId: string, score: string) => Promise<boolean> 
}) => {
  const [value, setValue] = useState(initialScore);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    setValue(initialScore);
    setStatus(initialScore !== "" ? "success" : "idle");
  }, [initialScore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "" || /^[0-9]+$/.test(rawVal)) {
      if (rawVal !== "" && parseInt(rawVal) > maxMark) return; 
      setValue(rawVal);
      setStatus("idle");
    }
  };

  const handleBlurOrEnter = async () => {
    if (value === initialScore) return; 
    if (value.trim() === "") return; 

    setStatus("saving");
    const success = await onSaveSingle(student.id, value);
    setStatus(success ? "success" : "error");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <div className="bg-white border-b border-[#e2e8f0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f8fafc] transition-colors">
      <div className="flex-grow">
        <div dir="auto" className="font-semibold text-[#001232] text-lg">{student.fullName}</div>
        <div className="text-sm text-[#64748b]">{student.email}</div>
      </div>
      
      <div className="flex items-center gap-3 self-end sm:self-auto">
        <div className="w-6 flex justify-center">
          {status === "saving" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          {status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
        </div>
        
        <input 
          type="text" inputMode="numeric" pattern="[0-9]*" value={value}
          onChange={handleInputChange} onBlur={handleBlurOrEnter} onKeyDown={handleKeyDown}
          placeholder="--"
          className={`w-24 text-center p-2.5 border-2 rounded-lg outline-none transition-colors text-[16px] font-bold
            ${status === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-[#e2e8f0] focus:border-[#001232]'}`}
        />
      </div>
    </div>
  );
});
StudentMarkRow.displayName = "StudentMarkRow";

// --- 3. Main Dashboard Component ---
export default function TeacherDailyMarks() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [totalDays, setTotalDays] = useState<number>(1); 
  const [marksData, setMarksData] = useState<Record<string, string>>({}); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "marked" | "unmarked">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [pdfResults, setPdfResults] = useState<any[] | null>(null);
  const [toast, setToast] = useState<{msg: string, type: "error"|"success"|"info"} | null>(null);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) setShowNav(false);
      else setShowNav(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch("/api/teacher/dashboard");
        if (!res.ok) throw new Error();
        const json = await res.json();
        setPrograms(json.data);
      } catch (err) {
        router.push("/teacher/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, [router]);

  useEffect(() => {
    if (!selectedProgram) return;
    const initProgram = async () => {
      setIsStudentsLoading(true);
      try {
        const resStudents = await fetch(`/api/teacher/dashboard?programId=${selectedProgram.id}`);
        if (resStudents.ok) {
          const jsonStudents = await resStudents.json();
          setStudents(jsonStudents.data);
        }

        const resDays = await fetch(`/api/teacher/marks/days?programId=${selectedProgram.id}`);
        if (resDays.ok) {
          const jsonDays = await resDays.json();
          setTotalDays(jsonDays.maxDay); 
          setSelectedDay(jsonDays.maxDay); 
        }
      } catch (err) {
        setToast({ msg: "Failed to load program data.", type: "error" });
      }
    };
    initProgram();
  }, [selectedProgram]);

  useEffect(() => {
    if (!selectedProgram) return;
    const fetchMarks = async () => {
      setIsStudentsLoading(true);
      try {
        const resMarks = await fetch(`/api/teacher/marks/bulk?programId=${selectedProgram.id}&dayNumber=${selectedDay}`);
        if (resMarks.ok) {
          const jsonMarks = await resMarks.json();
          const marksMap: Record<string, string> = {};
          jsonMarks.data.forEach((mark: any) => {
            marksMap[mark.studentId] = mark.score.toString();
          });
          setMarksData(marksMap);
        }
      } catch (err) {
        setToast({ msg: "Failed to load marks.", type: "error" });
      } finally {
        setIsStudentsLoading(false);
      }
    };
    fetchMarks();
  }, [selectedProgram, selectedDay]);

  const handleSaveSingleScore = async (studentId: string, score: string) => {
    if (!selectedProgram) return false;
    try {
      const res = await fetch("/api/teacher/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId: selectedProgram.id, dayNumber: selectedDay, score })
      });
      if (!res.ok) throw new Error();
      setMarksData(prev => ({ ...prev, [studentId]: score }));
      return true;
    } catch (error) {
      setToast({ msg: "Failed to save score. Check connection.", type: "error" });
      return false;
    }
  };

  const handleMarkAllZero = async () => {
    if (!selectedProgram) return;
    const payloadMarks: any[] = [];
    const newMarksData = { ...marksData };

    filteredStudents.forEach(student => {
      const currentScore = marksData[student.id];
      if (currentScore === undefined || currentScore.trim() === "") {
        newMarksData[student.id] = "0";
        payloadMarks.push({ studentId: student.id, score: "0", notes: null });
      }
    });

    if (payloadMarks.length === 0) return setToast({ msg: "No unmarked students visible.", type: "info" });
    
    setIsBulkSaving(true);
    try {
      const res = await fetch("/api/teacher/marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: selectedProgram.id, dayNumber: selectedDay, marks: payloadMarks })
      });
      if (!res.ok) throw new Error();
      setMarksData(newMarksData);
      setToast({ msg: `Successfully marked ${payloadMarks.length} students as 0.`, type: "success" });
    } catch (err) {
      setToast({ msg: "Database error during bulk save.", type: "error" });
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedProgram) return;
    setIsGeneratingPDF(true);
    setToast({ msg: "Calculating scores & preparing document...", type: "info" });

    try {
      const res = await fetch(`/api/teacher/results?programId=${selectedProgram.id}`);
      if (!res.ok) throw new Error();
      const { data: results } = await res.json();

      if (results.length === 0) {
        setIsGeneratingPDF(false);
        return setToast({ msg: "No approved students found for this program.", type: "error" });
      }

      setPdfResults(results);

      // Give React time to flush the DOM and the browser time to load the image/fonts
      setTimeout(async () => {
        try {
          const element = document.getElementById("hidden-pdf-report");
          if (!element) throw new Error("Template not mounted");

          // CRITICAL FIX: Force background color and use strict dimensions to ensure html2canvas doesn't crash on hidden elements
          const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
          });
          
          const imgData = canvas.toDataURL("image/png");
          
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          
          const cleanTitle = selectedProgram.titleEn.replace(/[^a-zA-Z0-9 -]/g, "");
          pdf.save(`Daily_Marks_Report_${cleanTitle}.pdf`);
          
          setToast({ msg: "PDF Downloaded Successfully!", type: "success" });
        } catch (err) {
          console.error("PDF Render Error:", err);
          setToast({ msg: "Failed to render PDF canvas. Check console for details.", type: "error" });
        } finally {
          setIsGeneratingPDF(false);
          setPdfResults(null);
        }
      }, 1500);

    } catch (err) {
      setToast({ msg: "Failed to fetch PDF data.", type: "error" });
      setIsGeneratingPDF(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const isMarked = marksData[student.id] !== undefined && marksData[student.id].trim() !== "";
    const matchesStatus = statusFilter === "all" || (statusFilter === "marked" && isMarked) || (statusFilter === "unmarked" && !isMarked);
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center">
        <Loader2 className="w-10 h-10 text-[#001232] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-[#1e293b] relative overflow-x-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- CRITICAL FIX: Push far off screen instead of opacity-0 to guarantee rendering --- */}
      {pdfResults && selectedProgram && (
        <div 
          id="hidden-pdf-report"
          className="absolute bg-white text-black p-12 -z-50 pointer-events-none"
          style={{ width: "210mm", top: "0", left: "-9999px" }}
        >
          <div className="text-center border-b-2 border-[#001232] pb-6 mb-8">
            <img src="/mutoon-logo.png" alt="Institute Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
            <h1 className="text-4xl font-extrabold text-[#001232]">Institute of Mutoon</h1>
            <h2 className="text-2xl text-[#FFB902] mt-3 font-semibold" dir="auto">{selectedProgram.titleEn}</h2>
            <h3 className="text-xl font-bold text-gray-700 mt-2 tracking-widest uppercase">Daily Marks Report & Rankings</h3>
          </div>
          
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-[#001232] text-white text-lg">
                <th className="border border-gray-300 p-4 text-center w-24">Rank</th>
                <th className="border border-gray-300 p-4 text-left">Full Name</th>
                <th className="border border-gray-300 p-4 text-center w-48">Total Daily Score</th>
              </tr>
            </thead>
            <tbody>
              {pdfResults.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="border border-gray-300 p-4 text-center font-bold text-lg">{index + 1}</td>
                  <td className="border border-gray-300 p-4 text-left font-bold text-lg" dir="auto">{row.fullName}</td>
                  <td className="border border-gray-300 p-4 text-center font-extrabold text-xl bg-[#fff3cd] text-[#001232]">
                    {row.programTotalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-8 text-center text-sm font-semibold text-gray-500">
            Generated by Institute of Mutoon Portal • {new Date().toLocaleString()}
          </div>
        </div>
      )}

      <nav className={`w-full bg-white border-b border-[#e2e8f0] shadow-sm fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out ${showNav ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#001232]">Marking Matrix</h1>
          <Link href="/teacher" className="flex items-center text-sm font-bold text-[#475569] bg-[#f1f5f9] hover:bg-[#e2e8f0] px-4 py-2 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Hub
          </Link>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8">
        {!selectedProgram ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div key={program.id} onClick={() => setSelectedProgram(program)} className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition-all transform hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="bg-yellow-50 p-3 rounded-lg mr-4">
                    <BookOpen className="w-8 h-8 text-[#FFB902]" />
                  </div>
                  <h3 dir="auto" className="text-lg font-bold text-[#001232]">{program.titleEn}</h3>
                </div>
                <button className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#001232] py-2 rounded-lg font-semibold mt-2 hover:bg-[#001232] hover:text-white transition-colors">
                  Open Register
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <button onClick={() => setSelectedProgram(null)} className="text-sm font-semibold text-[#64748b] hover:text-[#001232] flex items-center mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Change Program
                </button>
                <h2 className="text-2xl font-bold text-[#001232] flex items-center">
                  <BookOpen className="w-6 h-6 text-[#FFB902] mr-3" />
                  {selectedProgram.titleEn}
                </h2>
              </div>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="inline-flex items-center bg-white border border-[#e2e8f0] text-[#001232] px-4 py-2.5 rounded-lg font-bold hover:bg-[#f8fafc] transition-colors shadow-sm w-full sm:w-auto justify-center disabled:opacity-50"
              >
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 text-[#FFB902] animate-spin" /> : <FileText className="w-4 h-4 mr-2 text-[#FFB902]" />}
                {isGeneratingPDF ? "Generating PDF..." : "Daily Marks Report"}
              </button>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-2 flex overflow-x-auto gap-2 items-center no-scrollbar">
              {[...Array(totalDays)].map((_, i) => {
                const day = i + 1;
                return (
                  <button
                    key={day} onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${selectedDay === day ? 'bg-[#001232] text-white' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'}`}
                  >
                    Day {day}
                  </button>
                )
              })}
              <button
                onClick={() => {
                  const nextDay = totalDays + 1;
                  setTotalDays(nextDay);
                  setSelectedDay(nextDay);
                }}
                className="flex-shrink-0 flex items-center px-4 py-2.5 rounded-lg font-bold text-sm bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200 ml-2"
              >
                <span className="text-lg mr-1 leading-none">+</span> Add Day
              </button>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-grow">
                <input 
                  type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name or email..."
                  className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg outline-none focus:border-[#001232] focus:ring-1 focus:ring-[#001232] w-full sm:w-64"
                />
                <select 
                  value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg outline-none focus:border-[#001232] bg-white w-full sm:w-40"
                >
                  <option value="all">All Students</option>
                  <option value="marked">Marked ✓</option>
                  <option value="unmarked">Unmarked ✕</option>
                </select>
              </div>
              <button 
                onClick={handleMarkAllZero} disabled={isBulkSaving}
                className="w-full md:w-auto bg-[#f1f5f9] border border-[#e2e8f0] text-[#475569] px-5 py-2.5 rounded-lg font-bold hover:bg-[#e2e8f0] transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isBulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Mark Rest as 0
              </button>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="hidden sm:flex bg-[#f8fafc] border-b border-[#e2e8f0] p-4 text-sm font-bold text-[#64748b] uppercase tracking-wider">
                <div className="flex-grow">Student Details</div>
                <div className="w-32 text-center mr-[4.5rem]">Mark (/{selectedProgram.maxDailyMark})</div>
              </div>

              {isStudentsLoading ? (
                <div className="p-16 flex justify-center">
                  <Loader2 className="w-8 h-8 text-[#001232] animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-[#64748b] font-medium text-lg">
                  No students match your criteria.
                </div>
              ) : (
                <div className="flex flex-col min-h-0">
                  {filteredStudents.map((student) => (
                    <StudentMarkRow 
                      key={`${student.id}-${selectedDay}`} 
                      student={student}
                      programId={selectedProgram.id}
                      dayNumber={selectedDay}
                      maxMark={selectedProgram.maxDailyMark}
                      initialScore={marksData[student.id] ?? ""}
                      onSaveSingle={handleSaveSingleScore}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
