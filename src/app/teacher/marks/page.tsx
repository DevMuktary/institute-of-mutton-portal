"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  BookOpen, ArrowLeft, X, CheckCircle2, AlertCircle, Info, FileText
} from "lucide-react";

interface Program {
  id: string;
  titleEn: string;
  maxDailyMark: number;
}

interface Student {
  id: string;
  fullName: string;
  email: string; // Using email in place of the old 'username'
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

export default function TeacherDailyMarks() {
  const router = useRouter();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [marksData, setMarksData] = useState<Record<string, string>>({}); // Store scores as strings for exact input control
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "marked" | "unmarked">("all");

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
        const resStudents = await fetch(`/api/teacher/dashboard?programId=${selectedProgram.id}`);
        const resMarks = await fetch(`/api/teacher/marks/bulk?programId=${selectedProgram.id}&dayNumber=${selectedDay}`);
        
        if (resStudents.ok && resMarks.ok) {
          const jsonStudents = await resStudents.json();
          const jsonMarks = await resMarks.json();
          
          setStudents(jsonStudents.data);
          
          const marksMap: Record<string, string> = {};
          jsonMarks.data.forEach((mark: any) => {
            marksMap[mark.studentId] = mark.score.toString();
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

  const handleScoreChange = (studentId: string, value: string) => {
    setMarksData(prev => ({ ...prev, [studentId]: value }));
  };

  const handleMarkAllZero = () => {
    let updatedCount = 0;
    const newMarksData = { ...marksData };

    filteredStudents.forEach(student => {
      const currentScore = marksData[student.id];
      if (currentScore === undefined || currentScore.trim() === "") {
        newMarksData[student.id] = "0";
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      setMarksData(newMarksData);
      setToastType("info");
      setToastMessage(`${updatedCount} unmarked students set to 0. Please click 'Save All Marks'.`);
    } else {
      setToastType("info");
      setToastMessage("No visible unmarked students to update.");
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;
    setIsSaving(true);

    const payloadMarks = Object.entries(marksData)
      .filter(([_, score]) => score.trim() !== "")
      .map(([studentId, score]) => ({
        studentId,
        score: score,
        notes: null // Removed from your old PHP logic
      }));

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
      setToastMessage(`Daily marks for Day ${selectedDay} saved successfully! (${payloadMarks.length} students updated).`);
    } catch (err) {
      setToastType("error");
      setToastMessage("Database error. Failed to save marks.");
    } finally {
      setIsSaving(false);
    }
  };

  // 1:1 PHP Filtering Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isMarked = marksData[student.id] !== undefined && marksData[student.id].trim() !== "";
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "marked" && isMarked) || 
      (statusFilter === "unmarked" && !isMarked);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col w-full font-sans relative text-[#1e293b]">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Navbar replicating the top-bar */}
      <nav className="w-full bg-white border-b border-[#e2e8f0] shadow-sm sticky top-0 z-50 shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[#001232] m-0">Daily Memorization Marks</h1>
          </div>
          <Link 
            href="/teacher"
            className="flex items-center text-sm font-bold text-white bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Hub
          </Link>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col min-w-0">
        
        {!selectedProgram ? (
          /* Program Selection (Adapted to match the flow) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div 
                key={program.id}
                onClick={() => setSelectedProgram(program)}
                className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <BookOpen className="w-8 h-8 text-[#FFB902] mr-3" />
                  <h3 dir="auto" className="text-lg font-bold text-[#001232]">{program.titleEn}</h3>
                </div>
                <button className="w-full bg-[#001232] text-white py-2 rounded-lg font-semibold mt-2">
                  Select Program
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Replica of daily_marks.php layout */
          <div className="flex flex-col min-w-0 space-y-6">
            
            {/* Generate PDF Card */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm text-center p-6">
              <p className="mt-0 mb-4 text-[#1e293b]">Generate a PDF of the final program results, including daily and exam scores.</p>
              <button 
                onClick={() => {
                  setToastType("info");
                  setToastMessage("PDF Generation script integration coming soon.");
                }}
                className="inline-flex items-center bg-[#FFB902] text-[#001232] px-5 py-2.5 rounded-lg font-bold hover:bg-[#e0a200] transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" /> Generate Final Results PDF
              </button>
            </div>

            {/* Select Day Card */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm">
              <div className="p-5 border-b border-[#e2e8f0]">
                <h3 className="m-0 text-lg font-semibold">Select Day</h3>
              </div>
              <div className="p-5 flex items-center gap-4 flex-wrap">
                <label className="font-medium">Show marks for Day #:</label>
                <input 
                  type="number" 
                  min="1"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-[#e2e8f0] rounded-lg text-center font-bold text-lg outline-none focus:border-[#001232]"
                />
              </div>
            </div>

            {isStudentsLoading ? (
              <div className="p-12 flex justify-center bg-white rounded-xl shadow-sm">
                <div className="w-8 h-8 border-4 border-[#e2e8f0] border-t-[#001232] rounded-full animate-spin"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-6 text-center">
                <p>No students found.</p>
              </div>
            ) : (
              /* Enter Marks Card */
              <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-[#e2e8f0]">
                  <h3 className="m-0 text-lg font-semibold">Enter Marks for Day {selectedDay}</h3>
                </div>
                
                {/* Controls Grid */}
                <div className="p-5 bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-end">
                    <div>
                      <label className="block font-medium mb-2">Search Students</label>
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="By name or email..."
                        className="w-full px-4 py-2 border border-[#e2e8f0] rounded-lg outline-none focus:border-[#001232]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-2">Filter by Status</label>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full px-4 py-2 border border-[#e2e8f0] rounded-lg outline-none focus:border-[#001232] bg-white"
                      >
                        <option value="all">All</option>
                        <option value="marked">Marked</option>
                        <option value="unmarked">Unmarked</option>
                      </select>
                    </div>
                    <div>
                      <button 
                        type="button"
                        onClick={handleMarkAllZero}
                        className="w-full bg-[#64748b] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#475569] transition-colors"
                      >
                        Mark All Unmarked as 0
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form & Table */}
                <form onSubmit={handleSaveAll} className="flex flex-col min-h-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#f1f5f9] sticky top-0">
                        <tr>
                          <th className="p-4 font-semibold text-[#1e293b] border-b border-[#e2e8f0]">Student Info</th>
                          <th className="p-4 font-semibold text-[#1e293b] border-b border-[#e2e8f0] text-center w-32">Mark (0-{selectedProgram.maxDailyMark})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => {
                          const isFilled = marksData[student.id] !== undefined && marksData[student.id].trim() !== "";
                          return (
                            <tr key={student.id} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]">
                              <td className="p-4">
                                <div dir="auto" className="font-semibold text-[1.1rem] mb-1">{student.fullName}</div>
                                <div className="text-sm text-[#64748b]">{student.email}</div>
                              </td>
                              <td className="p-4 text-center">
                                <input 
                                  type="number"
                                  min="0"
                                  max={selectedProgram.maxDailyMark}
                                  step="1"
                                  value={marksData[student.id] ?? ""}
                                  onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                  placeholder="--"
                                  className={`w-20 text-center p-2 border border-[#e2e8f0] rounded-md text-lg outline-none focus:border-[#001232] ${isFilled ? 'bg-[#dcfce7]' : 'bg-white'}`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={2} className="p-8 text-center text-[#64748b]">No students match your search/filter criteria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Submission Bar */}
                  <div className="sticky bottom-0 bg-white/90 backdrop-blur-md p-4 border-t border-[#e2e8f0] text-right shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-[#001232] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#001232]/90 transition-all disabled:opacity-70"
                    >
                      {isSaving ? "Saving..." : `Save All Marks for Day ${selectedDay}`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}