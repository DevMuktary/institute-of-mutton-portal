import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans">
      {/* Simple Header */}
      <header className="w-full p-6 sm:p-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-2">
            <Image src="/mutoon-logo.png" alt="Logo" width={32} height={32} className="object-contain" priority />
          </div>
          <span className="font-extrabold text-[#001232] text-xl tracking-tight hidden sm:block">
            Institute of Mutoon
          </span>
        </div>
        
        <Link 
          href="/login" 
          className="bg-[#001232] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#001232]/90 transition-all shadow-md flex items-center"
        >
          Portal Login <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-[#FFB902]/10 rounded-full flex items-center justify-center mb-8">
          <BookOpen className="w-10 h-10 text-[#FFB902]" />
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#001232] tracking-tight mb-6">
          Something <span className="text-[#FFB902]">Amazing</span> is Coming.
        </h1>
        
        <p className="text-gray-500 text-lg sm:text-xl max-w-2xl font-medium leading-relaxed mb-10">
          We are currently building the ultimate public platform for  Mutoon memorization. 
        </p>

        <div className="inline-flex items-center space-x-2 bg-white border border-gray-200 px-6 py-3 rounded-full shadow-sm text-gray-500 font-semibold text-sm">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
          Student  Portal is Active
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-gray-200 bg-white">
        <p className="text-sm font-medium text-gray-400">
          &copy; {new Date().getFullYear()} Institute of Mutoon. Built by <a href="https://quadroxtech.cloud" target="_blank" rel="noopener noreferrer" className="font-bold text-[#001232] hover:text-[#FFB902] transition-colors">Quadrox Technologies</a>.
        </p>
      </footer>
    </div>
  );
}
