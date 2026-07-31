import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X, Menu, TrendingUp } from 'lucide-react';

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
    <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 w-full shadow-md">
      {/* Left: Sidebar Toggle */}
      <div>
        <button 
          onClick={toggleSidebar} 
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-800"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Center: Brand Name */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-slate-950 font-black">
          <TrendingUp size={16} />
        </div>
        <span className="text-base font-black tracking-wider text-white">
          MONEYKRISHNA MAM
        </span>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        <Link 
          href="/client/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-slate-200">Alex Rivera</div>
            <div className="text-[10px] text-emerald-400 font-semibold">MAM Investor</div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80" 
            alt="Client Profile" 
            className="w-8 h-8 rounded-xl border-2 border-emerald-500/60 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
