import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  BookOpen, 
  Clock, 
  Award, 
  PlayCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Bookmark,
  FileCheck,
  Briefcase,
  DollarSign,
  Wallet,
  Layers,
  Server,
  Users
} from 'lucide-react';

import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stats = [
    { title: 'MAM Account', value: '1 Active', change: 'Verified', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
    { title: 'MAM Funds Invested', value: '$12,450', change: '+12% this month', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
    { title: 'MAM Balance', value: '$15,200', change: 'Updated just now', icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
    { title: 'Total Account', value: '1', change: 'Primary', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
    { title: 'Active Nodes', value: '4', change: 'All Operational', icon: Server, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
    { title: 'Available Manager', value: '2', change: 'Ready', icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20' },
  ];

  const activeCourses = [
    {
      id: 1,
      title: 'Advanced Financial Analysis & Valuation',
      instructor: 'Dr. Robert Vance',
      progress: 68,
      nextLesson: 'Module 4: Discounted Cash Flow Models',
      duration: '45 mins remaining',
      category: 'Finance',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      id: 2,
      title: 'Technical Analysis & Market Psychology',
      instructor: 'Sarah Jenkins, CFA',
      progress: 42,
      nextLesson: 'Module 3: Candlestick Patterns & Momentum',
      duration: '30 mins remaining',
      category: 'Trading',
      gradient: 'from-blue-600 to-indigo-700',
    },
    
    {
      id: 3,
      title: 'Corporate Risk Management Frameworks',
      instructor: 'David Sterling',
      progress: 85,
      nextLesson: 'Module 6: Hedging Strategies & Options',
      duration: '15 mins remaining',
      category: 'Management',
      gradient: 'from-purple-600 to-pink-700',
    },
  ];

  const upcomingSchedule = [
    { time: 'Today, 2:00 PM', title: 'Live Q&A: Financial Modeling Workshop', instructor: 'Dr. Robert Vance', type: 'Live Stream' },
    { time: 'Tomorrow, 10:00 AM', title: 'Assignment Due: Valuation Case Study', instructor: 'Grade Target: 90%+', type: 'Assignment' },
    { time: 'Aug 4, 4:00 PM', title: 'Webinar: Global Market Outlook 2026', instructor: 'Guest Speaker Series', type: 'Webinar' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">
      <Head>
        <title>Student Dashboard | Money Krishna Education</title>
        <meta name="description" content="MAM Student Learning Portal Dashboard" />
      </Head>

      <ClientSidebar />

      <main className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <ClientHeader />

        <div className={`p-6 md:p-8 z-10 transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
     
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden bg-[#0a1128]/80 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 transition-all duration-300 hover:border-blue-400/30 hover:shadow-[0_10px_30px_rgba(37,99,235,0.1)] hover:-translate-y-1"
              >
                {/* Decorative circles */}
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all duration-500 z-0"></div>
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-600/10 rounded-full blur-xl group-hover:bg-indigo-600/20 transition-all duration-500 z-0"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-3.5 rounded-2xl border ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                      <stat.icon size={22} strokeWidth={1.5} />
                    </div>
                    <div className="w-8 h-8 rounded-full border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                  <h3 className="text-blue-200/60 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5">{stat.title}</h3>
                  <div className="text-3xl font-black text-white tracking-tight">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Active Courses & Schedule Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Enrolled Courses */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Continue Learning</h2>
                  <p className="text-xs text-slate-400">Your active enrolled courses and progress</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  All Courses <ChevronRight size={14} />
                </button>
              </div>

              {activeCourses.map((course) => (
                <div 
                  key={course.id}
                  className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/90 shadow-xl group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700 mb-2">
                        {course.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-400">Instructor: {course.instructor}</p>
                    </div>
                    
                    <button className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0">
                      <PlayCircle size={16} /> Resume Lesson
                    </button>
                  </div>

                  {/* Progress Bar & Next Module */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <Bookmark size={13} className="text-emerald-400" /> {course.nextLesson}
                      </span>
                      <span className="font-bold text-emerald-400">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming Schedule & Achievements */}
            <div className="space-y-6">
              {/* Schedule Box */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Calendar size={18} className="text-emerald-400" /> Live Schedule
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Aug 2026</span>
                </div>

                <div className="space-y-3">
                  {upcomingSchedule.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 mb-1">
                        <span>{item.time}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {item.type}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400">{item.instructor}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements Box */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <FileCheck size={18} className="text-amber-400" /> Recent Certificates
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Award size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">Financial Statement Analysis</h4>
                      <p className="text-[11px] text-slate-400">Issued July 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
