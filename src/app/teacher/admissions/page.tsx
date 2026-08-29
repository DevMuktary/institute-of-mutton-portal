"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Users,
  ChevronDown,
  ChevronRight,
  Download,
  Check,
  X,
  RotateCcw,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Globe,
  BookOpen,
  Info,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

// --- Types ---
interface ProgramRef {
  id: string;
  slug: string;
  titleEn: string;
  titleAr?: string | null;
  isPaid: boolean;
  isRegOpen: boolean;
  _count?: {
    enrollments: number;
  };
}

interface OtherEnrollment {
  id: string;
  programId: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  program: {
    id: string;
    titleEn: string;
  };
}

interface ApplicantUser {
  id: string;
  studentUniqueId?: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  country?: string | null;
  dob?: string | null;
  gender?: string | null;
  islamicKnowledge?: string | null;
  arabicLevel?: string | null;
  role: string;
  createdAt: string;
  enrollments?: OtherEnrollment[];
}

interface ApplicationItem {
  id: string;
  userId: string;
  programId: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  user: ApplicantUser;
  program: ProgramRef;
}

interface StatsData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  filteredCount: number;
}

// --- Custom Toast Component ---
const Toast = ({
  message,
  onClose,
  type = "info",
}: {
  message: string;
  onClose: () => void;
  type?: "error" | "success" | "info";
}) => {
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
    <div className="fixed top-20 right-4 sm:right-8 z-[9999] animate-slide-in max-w-[90vw]">
      <div className={`bg-white border-l-4 shadow-2xl rounded-r-xl p-4 flex items-start w-84 max-w-full ${currentStyle.border}`}>
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${currentStyle.iconText}`} />
        <div className="ml-3 w-full">
          <p className={`text-sm font-semibold break-words ${currentStyle.text}`}>{message}</p>
        </div>
        <button onClick={onClose} className={`ml-auto pl-3 shrink-0 ${currentStyle.iconText} hover:opacity-70`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function AdmissionsManagementPage() {
  const router = useRouter();

  // State: Data
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [programs, setPrograms] = useState<ProgramRef[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    filteredCount: 0,
  });

  // State: Loading & UI
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("info");

  // State: Filters
  const [selectedProgramId, setSelectedProgramId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [arabicFilter, setArabicFilter] = useState<string>("ALL");
  const [knowledgeFilter, setKnowledgeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // State: Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State: Action Modals
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicationItem | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionTargetIds, setRejectionTargetIds] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");

  const showToast = (message: string, type: "error" | "success" | "info" = "info") => {
    setToastMessage(message);
    setToastType(type);
  };

  // Fetch applications from API
  const fetchApplications = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (selectedProgramId && selectedProgramId !== "ALL") params.append("programId", selectedProgramId);
        if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (genderFilter !== "ALL") params.append("gender", genderFilter);
        if (arabicFilter !== "ALL") params.append("arabicLevel", arabicFilter);
        if (knowledgeFilter !== "ALL") params.append("islamicKnowledge", knowledgeFilter);
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);

        const res = await fetch(`/api/teacher/admissions?${params.toString()}`);
        if (res.status === 401) {
          router.push("/teacher/login");
          return;
        }

        const json = await res.json();
        if (json.success && json.data) {
          setApplications(json.data.enrollments || []);
          setPrograms(json.data.programs || []);
          setStats(json.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, filteredCount: 0 });
        } else {
          showToast(json.error || "Failed to load applications.", "error");
        }
      } catch (err) {
        showToast("Error connecting to server.", "error");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedProgramId, statusFilter, searchQuery, genderFilter, arabicFilter, knowledgeFilter, sortBy, sortOrder, router]
  );

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle single or bulk status updates
  const handleUpdateStatus = async (
    enrollmentIds: string[],
    action: "APPROVE" | "REJECT" | "PENDING",
    reason?: string
  ) => {
    if (enrollmentIds.length === 0) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch("/api/teacher/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentIds,
          action,
          rejectionReason: reason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Applications updated successfully.`, "success");
        // Clear selection
        setSelectedIds(new Set());
        // Close modals if open
        setRejectionModalOpen(false);
        setRejectionReason("");
        if (selectedApplicant && enrollmentIds.includes(selectedApplicant.id)) {
          setSelectedApplicant((prev) =>
            prev
              ? {
                  ...prev,
                  approvalStatus: action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "PENDING",
                }
              : null
          );
        }
        // Refresh data
        await fetchApplications(true);
      } else {
        showToast(data.error || "Failed to update application status.", "error");
      }
    } catch (err) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle deletion
  const handleDelete = async (enrollmentIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${enrollmentIds.length} application(s)? This action cannot be undone.`)) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch("/api/teacher/admissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentIds }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Deleted ${data.count} application(s).`, "success");
        setSelectedIds(new Set());
        setSelectedApplicant(null);
        await fetchApplications(true);
      } else {
        showToast(data.error || "Failed to delete applications.", "error");
      }
    } catch (err) {
      showToast("Network error during deletion.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Checkbox helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  // Export CSV Functionality
  const handleExportCSV = (exportSelectedOnly = false) => {
    const listToExport = exportSelectedOnly
      ? applications.filter((a) => selectedIds.has(a.id))
      : applications;

    if (listToExport.length === 0) {
      showToast("No records available to export.", "info");
      return;
    }

    const headers = [
      "Student ID",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Country",
      "Gender",
      "Islamic Knowledge",
      "Arabic Level",
      "Program",
      "Approval Status",
      "Applied Date",
    ];

    const rows = listToExport.map((item) => [
      `"${item.user.studentUniqueId || "N/A"}"`,
      `"${item.user.fullName.replace(/"/g, '""')}"`,
      `"${item.user.email}"`,
      `"${item.user.phoneNumber}"`,
      `"${item.user.country || "N/A"}"`,
      `"${item.user.gender || "N/A"}"`,
      `"${item.user.islamicKnowledge || "N/A"}"`,
      `"${item.user.arabicLevel || "N/A"}"`,
      `"${item.program.titleEn.replace(/"/g, '""')}"`,
      `"${item.approvalStatus}"`,
      `"${new Date(item.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split("T")[0];
    const programNameSlug = selectedProgramId === "ALL" ? "All_Programs" : "Filtered_Program";
    link.setAttribute("download", `Mutoon_Admissions_${programNameSlug}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} applicant records to CSV.`, "success");
  };

  const isFilterActive =
    genderFilter !== "ALL" ||
    arabicFilter !== "ALL" ||
    knowledgeFilter !== "ALL" ||
    searchQuery.trim() !== "";

  const resetDemographicFilters = () => {
    setGenderFilter("ALL");
    setArabicFilter("ALL");
    setKnowledgeFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} type={toastType} />}

      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/teacher"
              className="p-2 rounded-xl text-gray-500 hover:text-[#001232] hover:bg-gray-100 transition-colors flex items-center gap-1.5 font-medium text-sm"
              title="Return to Control Panel"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Control Panel</span>
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#001232] flex items-center justify-center p-1.5 shadow-xs">
                <Image src="/mutoon-logo.png" alt="Logo" width={22} height={22} className="object-contain" priority />
              </div>
              <div>
                <h1 className="font-extrabold text-[#001232] text-base sm:text-lg leading-tight tracking-tight">
                  Admissions & Applications
                </h1>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider hidden sm:block">
                  Student Registration Review Hub
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchApplications(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#001232]" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            <button
              onClick={() => handleExportCSV(false)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#001232] transition-colors flex items-center gap-2 text-xs sm:text-sm font-bold shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#FFB902]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* KPI Stats Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
          {/* Total Applications */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-[#001232] tracking-tight">{stats.total}</div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">All student applications</p>
            </div>
          </div>

          {/* Pending Applications */}
          <div
            onClick={() => setStatusFilter("PENDING")}
            className={`bg-white rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 shadow-2xs flex flex-col justify-between ${
              statusFilter === "PENDING"
                ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20"
                : "border-gray-200/80 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight flex items-center gap-2">
                {stats.pending}
                {stats.pending > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                )}
              </div>
              <p className="text-xs text-amber-700/80 font-medium mt-0.5">Awaiting admin decision</p>
            </div>
          </div>

          {/* Approved Applications */}
          <div
            onClick={() => setStatusFilter("APPROVED")}
            className={`bg-white rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 shadow-2xs flex flex-col justify-between ${
              statusFilter === "APPROVED"
                ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20"
                : "border-gray-200/80 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{stats.approved}</div>
              <p className="text-xs text-emerald-700/80 font-medium mt-0.5">Active enrolled students</p>
            </div>
          </div>

          {/* Rejected Applications */}
          <div
            onClick={() => setStatusFilter("REJECTED")}
            className={`bg-white rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 shadow-2xs flex flex-col justify-between ${
              statusFilter === "REJECTED"
                ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20"
                : "border-gray-200/80 hover:border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Rejected</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">{stats.rejected}</div>
              <p className="text-xs text-rose-700/80 font-medium mt-0.5">Declined applications</p>
            </div>
          </div>
        </section>

        {/* Filter Controls & Program Switcher Card */}
        <section className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-2xs flex flex-col gap-4">
          {/* Top Row: Program Selector & Status Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Program Dropdown */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-80 relative">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Select Program
                </label>
                <div className="relative">
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-gray-200 text-[#001232] text-sm font-bold rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232] transition-all cursor-pointer"
                  >
                    <option value="ALL">All Programs ({stats.total})</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titleEn} {p._count?.enrollments ? `(${p._count.enrollments})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Status Segmented Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider sm:hidden">
                Filter by Status
              </span>
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === "ALL"
                      ? "bg-white text-[#001232] shadow-2xs font-extrabold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-700">
                    {stats.total}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter("PENDING")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === "PENDING"
                      ? "bg-white text-amber-700 shadow-2xs font-extrabold"
                      : "text-gray-600 hover:text-amber-700"
                  }`}
                >
                  Pending
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      statusFilter === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {stats.pending}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter("APPROVED")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === "APPROVED"
                      ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                      : "text-gray-600 hover:text-emerald-700"
                  }`}
                >
                  Approved
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      statusFilter === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {stats.approved}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter("REJECTED")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === "REJECTED"
                      ? "bg-white text-rose-700 shadow-2xs font-extrabold"
                      : "text-gray-600 hover:text-rose-700"
                  }`}
                >
                  Rejected
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      statusFilter === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {stats.rejected}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, phone, ID..."
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001232]/20 focus:border-[#001232] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Demographics Filter Toggles */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isFilterActive || showFiltersDrawer
                    ? "bg-[#001232] text-white border-[#001232]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters {isFilterActive && <span className="w-2 h-2 rounded-full bg-[#FFB902]" />}
              </button>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Gender: All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <select
                value={arabicFilter}
                onChange={(e) => setArabicFilter(e.target.value)}
                className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Arabic: All</option>
                <option value="Yes">Fluent (Yes)</option>
                <option value="Basic">Basic</option>
                <option value="No">None (No)</option>
              </select>

              <select
                value={knowledgeFilter}
                onChange={(e) => setKnowledgeFilter(e.target.value)}
                className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Knowledge: All</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              {isFilterActive && (
                <button
                  onClick={resetDemographicFilters}
                  className="p-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Floating / Sticky Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-[#001232] text-white rounded-2xl p-4 shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-slide-in">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#FFB902] text-[#001232] font-black text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="text-sm font-bold text-slate-100">
                {selectedIds.size} application{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isProcessingAction}
                onClick={() => handleUpdateStatus(Array.from(selectedIds), "APPROVE")}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Approve Selected
              </button>

              <button
                disabled={isProcessingAction}
                onClick={() => {
                  setRejectionTargetIds(Array.from(selectedIds));
                  setRejectionModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject Selected
              </button>

              <button
                onClick={() => handleExportCSV(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-[#FFB902]" />
                Export Selected
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Deselect all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Applications List Section */}
        <section className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          {/* Header of Table */}
          <div className="p-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={applications.length > 0 && selectedIds.size === applications.length}
                onChange={handleSelectAllVisible}
                className="w-4 h-4 rounded text-[#001232] border-gray-300 focus:ring-[#001232] cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Showing {applications.length} Application{applications.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order as "asc" | "desc");
                }}
                className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="fullName-asc">Student Name (A-Z)</option>
                <option value="fullName-desc">Student Name (Z-A)</option>
                <option value="approvalStatus-asc">Status</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#001232] rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500 mt-4">Loading applicant records...</p>
            </div>
          ) : applications.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-4 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#001232]">No Applications Found</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
                No student applications match your selected program or filter criteria.
              </p>
              {isFilterActive && (
                <button
                  onClick={resetDemographicFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#001232] rounded-xl text-xs font-bold transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* Desktop / Tablet Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-slate-50/40">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Demographics</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Applied</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {applications.map((app, index) => {
                    const isSelected = selectedIds.has(app.id);
                    const user = app.user;

                    return (
                      <tr
                        key={app.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isSelected ? "bg-amber-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(app.id)}
                            className="w-4 h-4 rounded text-[#001232] border-gray-300 focus:ring-[#001232] cursor-pointer"
                          />
                        </td>

                        {/* Applicant Info */}
                        <td className="py-3 px-4">
                          <div
                            onClick={() => setSelectedApplicant(app)}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#001232] to-[#002255] text-[#FFB902] font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div
                                dir="auto"
                                className="font-bold text-[#001232] text-sm group-hover:text-blue-700 transition-colors flex items-center gap-1.5 truncate max-w-xs"
                              >
                                {user.fullName}
                                {user.studentUniqueId && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                    {user.studentUniqueId}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 font-medium truncate max-w-xs">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Program */}
                        <td className="py-3 px-4">
                          <span
                            dir="auto"
                            className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-[#001232] text-xs font-semibold max-w-xs truncate"
                          >
                            {app.program.titleEn}
                          </span>
                        </td>

                        {/* Demographics */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {user.gender && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {user.gender}
                              </span>
                            )}
                            {user.arabicLevel && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                                Ar: {user.arabicLevel}
                              </span>
                            )}
                            {user.country && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                {user.country}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col text-xs font-medium text-slate-600">
                            <a
                              href={`https://wa.me/${user.phoneNumber.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3 h-3" />
                              {user.phoneNumber}
                            </a>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {app.approvalStatus === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Approved
                            </span>
                          )}
                          {app.approvalStatus === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <Clock className="w-3 h-3 stroke-[2.5]" />
                              Pending
                            </span>
                          )}
                          {app.approvalStatus === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200/60">
                              <X className="w-3 h-3 stroke-[2.5]" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Applied Date */}
                        <td className="py-3 px-4 text-xs text-gray-400 font-medium whitespace-nowrap">
                          {new Date(app.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedApplicant(app)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[#001232] hover:bg-slate-100 transition-colors"
                              title="View Full Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {app.approvalStatus !== "APPROVED" && (
                              <button
                                disabled={isProcessingAction}
                                onClick={() => handleUpdateStatus([app.id], "APPROVE")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors disabled:opacity-50"
                                title="Approve Student"
                              >
                                Approve
                              </button>
                            )}

                            {app.approvalStatus !== "REJECTED" && (
                              <button
                                disabled={isProcessingAction}
                                onClick={() => {
                                  setRejectionTargetIds([app.id]);
                                  setRejectionModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50"
                                title="Reject Application"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Applicant Detail Slide-over / Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-slide-left">
            {/* Modal Header */}
            <div className="p-6 bg-[#001232] text-white flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FFB902] text-[#001232] font-black text-base flex items-center justify-center shadow-md">
                  {selectedApplicant.user.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 dir="auto" className="text-xl font-extrabold tracking-tight">
                    {selectedApplicant.user.fullName}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedApplicant.user.studentUniqueId || "Pending Student ID"} &bull; Applied on{" "}
                    {new Date(selectedApplicant.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedApplicant(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6 flex-grow">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50 border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Current Application Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedApplicant.approvalStatus === "APPROVED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Approved Enrollment
                      </span>
                    )}
                    {selectedApplicant.approvalStatus === "PENDING" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                        <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> Awaiting Review
                      </span>
                    )}
                    {selectedApplicant.approvalStatus === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800">
                        <X className="w-3.5 h-3.5 stroke-[2.5]" /> Rejected Application
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Program</span>
                  <span dir="auto" className="text-sm font-extrabold text-[#001232] block">
                    {selectedApplicant.program.titleEn}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-100 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 font-semibold">Email Address</p>
                      <a
                        href={`mailto:${selectedApplicant.user.email}`}
                        className="text-xs font-bold text-[#001232] hover:underline truncate block"
                      >
                        {selectedApplicant.user.email}
                      </a>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-100 flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 font-semibold">Phone (WhatsApp)</p>
                      <a
                        href={`https://wa.me/${selectedApplicant.user.phoneNumber.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:underline truncate block"
                      >
                        {selectedApplicant.user.phoneNumber}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal & Background Demographics */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                  Student Demographics & Background
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-semibold">Country</p>
                    <p className="text-xs font-bold text-[#001232] mt-0.5">
                      {selectedApplicant.user.country || "Not Specified"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-semibold">Gender</p>
                    <p className="text-xs font-bold text-[#001232] mt-0.5">
                      {selectedApplicant.user.gender || "Not Specified"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-semibold">Date of Birth</p>
                    <p className="text-xs font-bold text-[#001232] mt-0.5">
                      {selectedApplicant.user.dob || "Not Specified"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-semibold">Arabic Fluency</p>
                    <p className="text-xs font-bold text-blue-700 mt-0.5">
                      {selectedApplicant.user.arabicLevel || "Not Specified"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 col-span-2">
                    <p className="text-[11px] text-gray-400 font-semibold">Islamic Knowledge Level</p>
                    <p className="text-xs font-bold text-purple-700 mt-0.5">
                      {selectedApplicant.user.islamicKnowledge || "Not Specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cross-Program Enrollments History */}
              {selectedApplicant.user.enrollments && selectedApplicant.user.enrollments.length > 1 && (
                <div>
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                    Other Programs Enrolled In ({selectedApplicant.user.enrollments.length})
                  </h4>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                    {selectedApplicant.user.enrollments
                      .filter((e) => e.id !== selectedApplicant.id)
                      .map((otherEnr) => (
                        <div key={otherEnr.id} className="p-3 bg-white flex items-center justify-between text-xs">
                          <span dir="auto" className="font-bold text-[#001232]">
                            {otherEnr.program.titleEn}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                              otherEnr.approvalStatus === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : otherEnr.approvalStatus === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {otherEnr.approvalStatus}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="p-6 bg-slate-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 mt-auto">
              <button
                onClick={() => handleDelete([selectedApplicant.id])}
                disabled={isProcessingAction}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Application
              </button>

              <div className="flex items-center gap-2">
                {selectedApplicant.approvalStatus !== "PENDING" && (
                  <button
                    disabled={isProcessingAction}
                    onClick={() => handleUpdateStatus([selectedApplicant.id], "PENDING")}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
                  >
                    Reset to Pending
                  </button>
                )}

                {selectedApplicant.approvalStatus !== "REJECTED" && (
                  <button
                    disabled={isProcessingAction}
                    onClick={() => {
                      setRejectionTargetIds([selectedApplicant.id]);
                      setRejectionModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                  >
                    Reject Application
                  </button>
                )}

                {selectedApplicant.approvalStatus !== "APPROVED" && (
                  <button
                    disabled={isProcessingAction}
                    onClick={() => handleUpdateStatus([selectedApplicant.id], "APPROVE")}
                    className="px-5 py-2 rounded-xl bg-[#001232] hover:bg-[#001232]/90 text-[#FFB902] font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Send Welcome Email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[#001232]">Reject Application(s)</h3>
              </div>
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              You are about to reject <strong>{rejectionTargetIds.length}</strong> application(s). You can optionally
              provide a polite note explaining the outcome to the applicant.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Rejection Note / Feedback (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. This program cohort is full. We encourage you to apply for the next session."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isProcessingAction}
                onClick={() => handleUpdateStatus(rejectionTargetIds, "REJECT", rejectionReason)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-6 text-center shrink-0 mt-auto border-t border-gray-200/60 bg-white">
        <p className="text-xs font-medium text-gray-400">
          &copy; {new Date().getFullYear()} Institute of Mutoon &bull; Admissions Administration
        </p>
      </footer>

      {/* Animations CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `,
        }}
      />
    </div>
  );
}
