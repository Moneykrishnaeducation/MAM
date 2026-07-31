import React from 'react';
import Head from 'next/head';
import { UserCheck, Mail, Phone, Calendar, MessageSquare, Shield, Clock } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function ClientManagerPage() {
  const managerInfo = {
    name: 'Robert Vance',
    role: 'Senior Portfolio Manager',
    email: 'robert.vance@moneykrishna.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    experience: '12+ Years Financial Advisory',
    nextMeeting: 'Tomorrow at 2:00 PM',
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>My Manager | Client Portal</title>
      </Head>
      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ClientHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <UserCheck size={13} /> Personal Advisory
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Assigned Relationship Manager</h1>
              <p className="text-slate-400 text-sm mt-1">Direct communication line with your dedicated financial & learning manager.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manager Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img src={managerInfo.avatar} alt={managerInfo.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/40 shadow-lg" />
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{managerInfo.name}</h2>
              <span className="text-xs text-emerald-400 font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                {managerInfo.role}
              </span>
              <p className="text-xs text-slate-400 mb-6">{managerInfo.experience}</p>

              <div className="w-full space-y-2 text-xs">
                <button className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all shadow-md">
                  <MessageSquare size={16} /> Send Direct Message
                </button>
                <button className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl transition-all border border-slate-700">
                  <Calendar size={16} /> Schedule 1-on-1 Session
                </button>
              </div>
            </div>

            {/* Manager Details & Upcoming Schedule */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white mb-2">Manager Contact & Credentials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                    <Mail size={18} className="text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-slate-400 text-[11px]">Email Address</div>
                      <div className="text-slate-200 font-semibold truncate">{managerInfo.email}</div>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                    <Phone size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-slate-400 text-[11px]">Direct Phone</div>
                      <div className="text-slate-200 font-semibold">{managerInfo.phone}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-emerald-400" /> Scheduled Advisory Session
                </h3>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Upcoming Consultation</div>
                    <div className="text-sm font-bold text-slate-100">Q3 Portfolio & Course Strategy Sync</div>
                    <div className="text-xs text-slate-400 mt-1">{managerInfo.nextMeeting} (Google Meet)</div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
