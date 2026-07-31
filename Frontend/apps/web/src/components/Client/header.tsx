import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-[80px] flex items-center justify-between px-4 md:px-8 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20 w-full">
      <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-full w-[200px] md:w-[350px] border border-white/5 transition-all duration-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search courses, students..." 
          className="bg-transparent border-none text-slate-50 outline-none w-full text-[0.95rem] placeholder-slate-500 font-sans"
        />
      </div>
      <div className="flex items-center gap-5">
        <button className="bg-transparent border-none text-slate-400 cursor-pointer relative transition-colors duration-300 p-2 rounded-full hover:text-slate-50 hover:bg-white/5">
          <Bell size={20} />
          <span className="absolute top-[2px] right-[4px] bg-red-500 text-white text-[0.65rem] font-bold h-4 min-w-[16px] rounded-full flex items-center justify-center px-1 border-2 border-slate-900">3</span>
        </button>
        <div className="cursor-pointer transition-transform duration-300 hover:scale-105">
          <img 
            src="https://i.pravatar.cc/150?img=11" 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover"
          />
        </div>
      </div>
    </header>
  );
}
