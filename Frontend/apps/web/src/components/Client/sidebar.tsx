import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings 
} from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-[260px] h-full bg-slate-800/70 backdrop-blur-xl border-r border-white/5 p-6 z-10 sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-gradient-to-br from-blue-500 to-violet-500 text-white font-bold py-2 px-3 rounded-xl text-lg shadow-[0_4px_15px_rgba(59,130,246,0.4)]">
          MAM
        </div>
        <h2 className="text-xl font-semibold m-0 tracking-tight text-white">Education</h2>
      </div>
      
      <nav className="flex flex-col gap-2">
        <Link href="/Dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-blue-500/15 to-transparent text-blue-500 border-l-4 border-blue-500">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all duration-300 hover:bg-white/5 hover:text-slate-50 hover:translate-x-1">
          <Users size={20} />
          <span>Students</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all duration-300 hover:bg-white/5 hover:text-slate-50 hover:translate-x-1">
          <BookOpen size={20} />
          <span>Courses</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium transition-all duration-300 hover:bg-white/5 hover:text-slate-50 hover:translate-x-1">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
