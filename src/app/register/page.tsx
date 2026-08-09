import Link from "next/link";
import Image from "next/image";
import { countries } from "@/lib/countries";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="bg-[#001232] p-8 text-center flex flex-col items-center">
          <Image 
            src="/mutoon-logo.png" 
            alt="Institute of Mutton Logo" 
            width={100} 
            height={100} 
            className="mb-4 object-contain"
            priority
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Institute of Mutton
          </h1>
          <p className="text-[#FFB902] mt-2 font-medium">
            Student Portal Registration
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
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

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[#001232] mb-1">Phone Number</label>
                <input type="tel" id="phone" name="phone" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232]"
                  placeholder="+123 456 7890" />
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-[#001232] mb-1">Country</label>
                <select id="country" name="country" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  <option value="">-- Select Country --</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="arabic" className="block text-sm font-semibold text-[#001232] mb-1">Do you read & understand Arabic?</label>
                <select id="arabic" name="arabic" required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                  <option value="">-- Please Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Basic">Basic</option>
                </select>
              </div>
            </div>

            {/* Program Selection */}
            <div className="pt-2">
              <label htmlFor="program" className="block text-sm font-semibold text-[#001232] mb-1">Select Program</label>
              <select id="program" name="program" required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB902] focus:border-[#FFB902] outline-none transition-all text-[#001232] bg-white">
                <option value="">-- Choose a program --</option>
                <option value="prog_1">Foundation in Islamic Studies (Paid)</option>
                <option value="prog_2">Arabic Grammar Basics (Free)</option>
              </select>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start pt-4">
              <div className="flex items-center h-5">
                <input id="agreement" name="agreement" type="checkbox" required
                  className="w-5 h-5 border border-gray-300 rounded bg-white focus:ring-3 focus:ring-[#FFB902] text-[#001232] accent-[#001232]" />
              </div>
              <label htmlFor="agreement" className="ml-3 text-sm font-medium text-[#001232] leading-snug">
                I commit to diligently participate in this program and understand the requirements for successful completion.
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
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}