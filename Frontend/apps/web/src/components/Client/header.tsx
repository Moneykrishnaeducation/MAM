// import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, BookOpen, GraduationCap, User, Power, X, Menu, } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function ClientHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-client-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-client-sidebar', handleToggle);
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(new Event('toggle-client-sidebar'));
  };

  return (
    <header 
      className="h-16 flex items-center justify-between px-6 border-b border-[#213f8c] sticky top-0 z-30 w-full shadow-md" 
      style={{ backgroundColor: '#13285c' }}
    >
      {/* Left: Close Icon */}
      <div>
        <button onClick={toggleSidebar} className="text-white hover:text-slate-300 transition-colors cursor-pointer p-1">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Center: Logo */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        {/* Placeholder SVG matching the VTINDEX logo style */}
        <div className="w-10 h-10 flex items-center justify-center relative">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            {/* 3 blades for VTINDEX logo */}
            <path d="M50 10 C 65 30 75 50 60 70 C 45 50 45 30 50 10 Z" fill="url(#goldGrad)" transform="rotate(0 50 50)"/>
            <path d="M50 10 C 65 30 75 50 60 70 C 45 50 45 30 50 10 Z" fill="url(#goldGrad)" transform="rotate(120 50 50)"/>
            <path d="M50 10 C 65 30 75 50 60 70 C 45 50 45 30 50 10 Z" fill="url(#goldGrad)" transform="rotate(240 50 50)"/>
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[22px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-600 leading-none mb-1">
            VTINDEX
          </span>
          <span className="text-[9px] tracking-[0.2em] text-yellow-500 font-bold leading-none">
            Rise With The Leader
          </span>
        </div>
      </div>

        {/* User Profile */}
        <Link 
          href="/client/profile"
          className="flex items-center gap-3 pl-3 border-l border-slate-800 hover:opacity-80 transition-opacity cursor-pointer decoration-none"
        >
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-slate-200">Alex Rivera</div>
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
              <BookOpen size={11} className="text-emerald-400" /> Student
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80" 
            alt="Client Profile" 
            className="w-9 h-9 rounded-xl border-2 border-emerald-500/60 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
