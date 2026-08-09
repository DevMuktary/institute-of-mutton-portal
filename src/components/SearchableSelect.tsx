"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface Option {
  label: string;
  value: string;
  prefix?: string; 
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchable?: boolean;
}

export default function SearchableSelect({ options, value, onChange, placeholder, searchable = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-lg outline-none transition-all flex justify-between items-center bg-white text-[16px] ${
          isOpen ? "border-[#FFB902] ring-2 ring-[#FFB902]" : "border-gray-300"
        }`}
      >
        <span className={`truncate ${selectedOption ? "text-[#001232]" : "text-gray-500"}`}>
          {selectedOption ? (
            <>
              {selectedOption.prefix && <span className="mr-2">{selectedOption.prefix}</span>}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 text-[16px] border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#FFB902] focus:border-[#FFB902] text-[#001232]"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            </div>
          )}
          
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-4 py-3 text-[16px] cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    value === opt.value ? "bg-[#001232]/5 text-[#001232] font-semibold" : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    {opt.prefix && <span className="mr-2">{opt.prefix}</span>}
                    {opt.label}
                  </div>
                  {value === opt.value && <Check className="w-4 h-4 text-[#FFB902]" />}
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-[16px] text-gray-500 text-center">No results found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}