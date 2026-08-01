import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Clock, 
  ArrowDownCircle, 
  RefreshCw, 
  ArrowRightLeft, 
  Search, 
  RotateCw, 
  Calendar, 
  User, 
  Users, 
  CircleDollarSign, 
  FileText, 
  Flag,
  FileSearch,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function TransactionHistory() {
  const [activeTab, setActiveTab] = useState('PENDING');

  const tabs = [
    { id: 'PENDING', label: 'PENDING', icon: Clock },
    { id: 'DEPOSIT', label: 'DEPOSIT', icon: ArrowDownCircle },
    { id: 'WITHDRAWAL', label: 'WITHDRAWAL', icon: RefreshCw },
    { id: 'INTERNAL_TRANSFER', label: 'INTERNAL TRANSFER', icon: ArrowRightLeft },
  ];

  return (
    <>
      <Head>
        <title>Transaction History | Client Portal</title>
      </Head>
        
        <div className="p-6 md:p-8 flex flex-col flex-1">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        {/* Tabs */}
        <div className="flex bg-[#0e1736] rounded-full p-1.5 border border-[#1b2b5a] shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 tracking-wider ${
                  isActive 
                    ? 'bg-[#EAB308] text-[#0A1128] shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                    : 'text-[#8a9cc3] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#0A1128]' : 'text-[#4965a3]'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search and Refresh */}
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4965a3]" size={18} />
            <input 
              type="text" 
              placeholder="Search history..." 
              className="w-[320px] bg-[#0e1736] border border-[#1b2b5a] rounded-full py-2.5 pl-12 pr-4 text-sm text-blue-100 placeholder-[#4965a3] focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>
          <button className="bg-[#0e1736] border border-[#1b2b5a] w-[42px] h-[42px] flex items-center justify-center rounded-2xl hover:bg-white/5 transition-colors group shadow-lg">
            <RotateCw size={18} className="text-[#EAB308] group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-[#0e1736] rounded-2xl border border-[#1b2b5a] overflow-hidden shadow-2xl flex flex-col flex-1">
        {/* Header */}
        <div className="grid grid-cols-6 bg-[#162963] border-b border-[#1b2b5a] text-[11px] font-bold text-white/90 tracking-widest">
          <div className="px-5 py-4 flex items-center gap-2 border-r border-[#1b2b5a]/50">
            <Calendar size={14} className="text-[#6484c9]" /> DATE & TIME
          </div>
          <div className="px-5 py-4 flex items-center gap-2 border-r border-[#1b2b5a]/50">
            <User size={14} className="text-[#6484c9]" /> BENEFICIARY
          </div>
          <div className="px-5 py-4 flex items-center gap-2 border-r border-[#1b2b5a]/50">
            <Users size={14} className="text-[#6484c9]" /> ACCOUNT(S)
          </div>
          <div className="px-5 py-4 flex items-center gap-2 border-r border-[#1b2b5a]/50">
            <CircleDollarSign size={14} className="text-[#6484c9]" /> AMOUNT
          </div>
          <div className="px-5 py-4 flex items-center gap-2 border-r border-[#1b2b5a]/50">
            <FileText size={14} className="text-[#6484c9]" /> REFERENCE
          </div>
          <div className="px-5 py-4 flex items-center gap-2">
            <Flag size={14} className="text-[#6484c9]" /> STATUS
          </div>
        </div>

        {/* Content Area (Empty State) */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px]">
          <div className="mb-6 opacity-90">
            <FileText size={80} className="text-[#6484c9] drop-shadow-md" strokeWidth={1.5} />
          </div>
          <h2 className="text-[28px] font-black mb-3 tracking-tight text-white drop-shadow-sm">NO RECORDS FOUND</h2>
          <p className="text-[#6484c9] text-base mb-8">Try adjusting your search or refreshing the data.</p>
          <div className="flex gap-4">
            <button className="px-8 py-3 rounded-full border-2 border-[#1b2b5a] bg-transparent hover:bg-[#1b2b5a]/30 text-[#EAB308] font-bold text-xs tracking-widest transition-all duration-300">
              REFRESH
            </button>
            <button className="px-8 py-3 rounded-full border-2 border-[#1b2b5a] bg-transparent hover:bg-[#1b2b5a]/30 text-white font-bold text-xs tracking-widest transition-all duration-300">
              CLEAR SEARCH
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0e1736] border-t border-[#1b2b5a] p-4 flex justify-between items-center px-6">
          <span className="text-[#3a4f82] text-xs font-bold tracking-[0.2em]">NO RECORDS</span>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full border border-[#1b2b5a] flex items-center justify-center text-[#3a4f82] bg-transparent hover:text-[#6484c9] hover:border-[#3a4f82] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button className="w-9 h-9 rounded-full bg-[#EAB308] text-[#0b1229] flex items-center justify-center font-black text-sm shadow-[0_0_12px_rgba(234,179,8,0.3)]">
              1
            </button>
            <button className="w-9 h-9 rounded-full border border-[#1b2b5a] flex items-center justify-center text-[#3a4f82] bg-transparent hover:text-[#6484c9] hover:border-[#3a4f82] transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
        </div>
    </>
  );
}
