"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOut,
  KeyRound,
  ChevronDown,
  CalendarDays,
  GraduationCap,
  Users,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export interface TeacherUserData {
  id?: string;
  fullName: string;
  email: string;
  role: string;
}

interface TeacherNavbarProps {
  userData?: TeacherUserData | null;
  // Deprecated/Ignored props kept for backwards compatibility so callers don't type-error
  title?: string;
  subtitle?: string;
  backHref?: string;
  children?: React.ReactNode;
}

/**
 * Global Application Header for Teacher / Faculty Portal.
 * Purely represents the overall app/website (Branding, App Navigation, Profile & Hamburger Menu).
 * Page-specific titles, back buttons, and action buttons live below this header in the page body.
 */
export default function TeacherNavbar({
  userData: initialUserData,
}: TeacherNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [userData, setUserData] = useState<TeacherUserData | null>(initialUserData || null);
  const [pendingAdmissions, setPendingAdmissions] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user data if not passed from parent
  useEffect(() => {
    if (initialUserData) {
      setUserData(initialUserData);
      return;
    }

    let isMounted = true;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setUserData(json.data);
          }
        }
      } catch (e) {
        // Non-critical
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [initialUserData]);

  // Fetch pending admissions count for badge
  useEffect(() => {
    let isMounted = true;
    const fetchPendingAdmissions = async () => {
      try {
        const res = await fetch("/api/teacher/admissions?status=PENDING");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data?.stats) {
            setPendingAdmissions(json.data.stats.pending || 0);
          }
        }
      } catch (e) {
        // Non-critical
      }
    };
    fetchPendingAdmissions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      router.push("/teacher/login");
    }
  };

  const navLinks = [
    {
      name: "Control Panel",
      href: "/teacher",
      icon: LayoutGrid,
      exact: true,
      description: "Portal overview & modules",
    },
    {
      name: "Daily Marks",
      href: "/teacher/marks",
      icon: CalendarDays,
      exact: false,
      description: "Record students' daily memorization",
    },
    {
      name: "Examinations",
      href: "/teacher/examinations",
      icon: GraduationCap,
      exact: false,
      description: "Manage tests, quizzes & live proctoring",
    },
    {
      name: "Admissions",
      href: "/teacher/admissions",
      icon: Users,
      exact: false,
      badge: pendingAdmissions > 0 ? pendingAdmissions : undefined,
      description: "Review & approve applicant files",
    },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const userInitials = userData?.fullName
    ? userData.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("")
    : "T";

  return (
    <>
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Global Application Sticky Header */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Left: Global Website / App Branding Alone */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link
                href="/teacher"
                className="flex items-center space-x-2.5 sm:space-x-3 group focus:outline-none"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#001232] flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <Image
                    src="/mutoon-logo.png"
                    alt="Mutoon Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#001232] text-base sm:text-lg leading-tight tracking-tight">
                      Institute of Mutoon
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60 uppercase tracking-wider">
                      Faculty
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Staff Portal
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Pills */}
              <nav className="hidden lg:flex items-center space-x-1 ml-6 border-l border-gray-200 pl-6">
                {navLinks.map((link) => {
                  const active = isLinkActive(link.href, link.exact);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-[#001232] text-white shadow-xs"
                          : "text-gray-600 hover:text-[#001232] hover:bg-gray-100/80"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                      {link.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            active
                              ? "bg-[#FFB902] text-[#001232]"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: User Profile (Desktop) & Hamburger Menu Button (Mobile) */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Desktop Profile Dropdown */}
              <div className="relative hidden md:block" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#001232] text-[#FFB902] flex items-center justify-center font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-bold text-[#001232] leading-tight truncate max-w-[120px]">
                      {userData ? userData.fullName.split(" ")[0] : "Faculty"}
                    </p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {userData?.role || "TEACHER"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      isProfileDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-[#001232] truncate">
                        {userData?.fullName || "Faculty Member"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {userData?.email || "staff@mutoon.org"}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <KeyRound className="w-4 h-4 mr-2.5 text-amber-500" />
                      <span>Change Password</span>
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="relative p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#001232] transition-colors focus:outline-none shadow-2xs active:scale-95"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-6 h-6" />
                {pendingAdmissions > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#001232]/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-left">
            
            {/* Drawer Top Header with Logo and Close Button */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#001232] flex items-center justify-center p-1.5 shadow-sm">
                  <Image
                    src="/mutoon-logo.png"
                    alt="Logo"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-extrabold text-[#001232] text-sm leading-tight">
                    Institute of Mutoon
                  </h2>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    Staff Portal
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teacher Profile Card inside Mobile Drawer */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-[#001232] to-[#082252] text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#FFB902] font-black text-base shadow-inner">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-white truncate">
                    {userData?.fullName || "Staff Member"}
                  </p>
                  <p className="text-[11px] text-gray-300 truncate">
                    {userData?.email || "staff@mutoon.org"}
                  </p>
                  <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFB902] text-[#001232]">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {userData?.role || "TEACHER"}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Links in Mobile Drawer */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <div className="px-3 py-1 mb-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Menu Navigation
                </span>
              </div>

              {navLinks.map((link) => {
                const active = isLinkActive(link.href, link.exact);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${
                      active
                        ? "bg-[#001232] text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        active
                          ? "bg-white/15 text-[#FFB902]"
                          : "bg-gray-100 text-[#001232]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate">
                          {link.name}
                        </span>
                        {link.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              active
                                ? "bg-[#FFB902] text-[#001232]"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {link.badge} pending
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          active ? "text-gray-300" : "text-gray-400"
                        }`}
                      >
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}

              <div className="pt-4 mt-3 border-t border-gray-100 px-3">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Account & Security
                </span>
              </div>

              {/* Change Password Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-800">
                    Change Password
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Update your account credentials
                  </p>
                </div>
              </button>

              {/* Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-red-600">
                    Log Out
                  </span>
                  <p className="text-[11px] text-red-400">
                    End current session safely
                  </p>
                </div>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 text-center bg-gray-50/50">
              <p className="text-[11px] text-gray-400 font-medium">
                Institute of Mutoon • Faculty Suite
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
