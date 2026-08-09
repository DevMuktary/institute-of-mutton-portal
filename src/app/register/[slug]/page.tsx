"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { countries } from "@/lib/countries";

export default function MemorizationRegistrationPage() {
  const params = useParams();
  
  // Format the URL slug into a readable program name (e.g., "arabic-basics" -> "Arabic Basics")
  const rawSlug = params?.slug as string || "program";
  const programName = rawSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // State to manage the active dial code based on country selection
  const [dialCode, setDialCode] = useState(countries[0].dialCode); // Defaults to Nigeria (+234)

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = countries.find(c => c.name === e.target.value);
    if (selected) {
      setDialCode(selected.dialCode);
    }
  };

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
          <form className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-[#001232] mb-1">Full Name</label>
                <input type="text" id="fullName" name="fullName" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                  placeholder="Enter your full name" />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#001232] mb-1">Email Address</label>
                <input type="email" id="email" name="email" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                  placeholder="you@example.com" />
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-[#001232] mb-1">Country</label>
                <select id="country" name="country" required onChange={handleCountryChange} defaultValue="Nigeria"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[#001232] mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 font-medium sm:text-sm">
                    {dialCode}
                  </span>
                  <input type="tel" id="phone" name="phone" required
                    className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                    placeholder="801 234 5678" />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dob" className="block text-sm font-semibold text-[#001232] mb-1">Date of Birth</label>
                <input type="date" id="dob" name="dob" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white" />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-semibold text-[#001232] mb-1">Gender</label>
                <select id="gender" name="gender" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-200 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level of Islamic Knowledge */}
              <div>
                <label htmlFor="knowledge" className="block text-sm font-semibold text-[#001232] mb-1">Level of Islamic Knowledge</label>
                <select id="knowledge" name="knowledge" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  <option value="">-- Select Level --</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Arabic Understanding */}
              <div>
                <label htmlFor="arabic" className="block text-sm font-semibold text-[#001232] mb-1">Read & Understand Arabic?</label>
                <select id="arabic" name="arabic" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  <option value="">-- Please Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Basic">Basic</option>
                </select>
              </div>
            </div>

            {/* Hidden field to pass program slug to server action later */}
            <input type="hidden" name="programSlug" value={rawSlug} />

            {/* Agreement Checkbox */}
            <div className="flex items-start pt-4">
              <div className="flex items-center h-5 mt-1">
                <input id="agreement" name="agreement" type="checkbox" required
                  className="w-5 h-5 border border-gray-300 rounded bg-white focus:ring-3 focus:ring-[#FFB902] text-[#001232] accent-[#001232] cursor-pointer" />
              </div>
              <label htmlFor="agreement" className="ml-3 text-sm font-medium text-[#001232] leading-snug cursor-pointer">
                I commit to diligently participate in this memorization program and understand the requirements for successful completion.
              </label>
            </div>

            {/* Submit */}
            <button type="submit"
              className="w-full bg-[#001232] text-white font-bold py-4 px-4 rounded-lg hover:bg-[#001232]/90 transition-colors focus:ring-4 focus:ring-[#001232]/20 mt-4 text-lg">
              Submit Application
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