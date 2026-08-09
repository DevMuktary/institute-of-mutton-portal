"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { countries } from "@/lib/countries";
import SearchableSelect from "@/components/SearchableSelect";

export default function MemorizationRegistrationPage() {
  const params = useParams();
  const rawSlug = params?.slug as string || "program";
  const programName = rawSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [gender, setGender] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [arabic, setArabic] = useState("");
  const [agreement, setAgreement] = useState(false);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("");

  // Derived dial code
  const selectedCountry = countries.find(c => c.name === country);
  const dialCode = selectedCountry ? selectedCountry.dialCode : "+234";

  // Dropdown Options
  const countryOptions = countries.map(c => ({ label: c.name, value: c.name, prefix: c.flag }));
  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" }
  ];
  const knowledgeOptions = [
    { label: "Beginner", value: "Beginner" },
    { label: "Intermediate", value: "Intermediate" },
    { label: "Advanced", value: "Advanced" }
  ];
  const arabicOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
    { label: "Basic", value: "Basic" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!gender || !knowledge || !arabic) {
      setError("Please ensure all dropdown fields are selected.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          country,
          dob,
          gender,
          knowledge,
          arabic,
          programSlug: rawSlug
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong during registration.");
      } else {
        setApprovalStatus(data.status);
        setIsSuccess(true);
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-[#001232] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#FFB902]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-[#001232] mb-2">Registration Successful</h2>
          <p className="text-gray-600 mb-6">
            {approvalStatus === "APPROVED" 
              ? "Your registration is approved! Please check your email for your login credentials."
              : "Your application has been received and is pending administrative review. We will notify you via email shortly."}
          </p>
          <Link href="/login" className="inline-block w-full bg-[#001232] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#001232]/90 transition-colors">
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center pb-12 pt-8 sm:p-8">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
        
        {/* Premium Header Section */}
        <div className="relative bg-[#001232] px-8 pt-12 pb-20 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Institute of Mutton
          </h1>
          <p className="text-[#FFB902] mt-2 text-sm font-semibold uppercase tracking-wider">
            Memorization Program Application
          </p>
        </div>

        {/* Floating Cube Logo & Dynamic Title */}
        <div className="px-8 relative -mt-12 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center border border-gray-100 mb-6">
            <Image 
              src="/mutoon-logo.png" 
              alt="Institute of Mutton Logo" 
              width={80} 
              height={80} 
              className="object-contain"
              priority
            />
          </div>
          
          <div className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 text-center mb-6">
            <p className="text-sm text-gray-500 font-medium mb-1">Applying for Program:</p>
            <h2 className="text-xl font-bold text-[#001232]">{programName}</h2>
          </div>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Full Name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                  placeholder="Enter your full name" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                  placeholder="you@example.com" />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Country</label>
                <SearchableSelect 
                  options={countryOptions}
                  value={country}
                  onChange={setCountry}
                  placeholder="-- Select Country --"
                  searchable={true}
                />
              </div>

              {/* Smart Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 font-medium sm:text-sm">
                    {dialCode}
                  </span>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                    placeholder="801 234 5678" />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Date of Birth</label>
                <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white" />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Gender</label>
                <SearchableSelect 
                  options={genderOptions}
                  value={gender}
                  onChange={setGender}
                  placeholder="-- Select Gender --"
                />
              </div>
            </div>

            <hr className="border-gray-200 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level of Islamic Knowledge */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Level of Islamic Knowledge</label>
                <SearchableSelect 
                  options={knowledgeOptions}
                  value={knowledge}
                  onChange={setKnowledge}
                  placeholder="-- Select Level --"
                />
              </div>

              {/* Arabic Understanding */}
              <div>
                <label className="block text-sm font-semibold text-[#001232] mb-1">Read & Understand Arabic?</label>
                <SearchableSelect 
                  options={arabicOptions}
                  value={arabic}
                  onChange={setArabic}
                  placeholder="-- Please Select --"
                />
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start pt-4">
              <div className="flex items-center h-5 mt-1">
                <input id="agreement" type="checkbox" required checked={agreement} onChange={(e) => setAgreement(e.target.checked)}
                  className="w-5 h-5 border border-gray-300 rounded bg-white focus:ring-3 focus:ring-[#FFB902] text-[#001232] accent-[#001232] cursor-pointer" />
              </div>
              <label htmlFor="agreement" className="ml-3 text-sm font-medium text-[#001232] leading-snug cursor-pointer">
                I commit to diligently participate in this memorization program and understand the requirements for successful completion.
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              className="w-full bg-[#001232] text-white font-bold py-4 px-4 rounded-lg hover:bg-[#001232]/90 transition-all focus:ring-4 focus:ring-[#001232]/20 mt-4 text-lg disabled:opacity-70 flex justify-center items-center">
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Submit Application"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#001232] font-bold hover:text-[#FFB902] transition-colors">
              Sign in to Student Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}