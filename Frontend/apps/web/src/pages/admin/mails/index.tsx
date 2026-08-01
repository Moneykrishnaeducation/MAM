import React, { useState } from 'react';
import Head from 'next/head';
import { Mail, Search, Send, Star, Inbox, Trash2 } from 'lucide-react';

export default function AdminMailsPage() {
  const [selectedMail, setSelectedMail] = useState<number>(1);

  const mails = [
    { id: 1, sender: 'Alex Rivera', subject: 'Inquiry regarding Course Valuation module', snippet: 'Hello Admin, I had a quick question regarding module 4 access...', time: '10:45 AM', unread: true },
    { id: 2, sender: 'Apex Education Ventures', subject: 'Q3 Financial Distribution Report', snippet: 'Attached is the quarterly investment summary for review...', time: 'Yesterday', unread: true },
    { id: 3, sender: 'System Audit Bot', subject: 'Weekly Automated Backup Status: Success', snippet: 'All database tables successfully backed up to cloud storage...', time: 'Jul 29', unread: false },
  ];

  const currentMail = mails.find(m => m.id === selectedMail) || mails[0];

  return (
    <>
      <Head>
        <title>Mails & Messages | Admin Portal</title>
      </Head>
        <div className="p-6 md:p-8 flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Mail size={13} /> Internal Communications
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Inbox</h1>
              <p className="text-slate-400 text-sm mt-1">Manage incoming inquiries, user messages, and system notifications.</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto">
              <Send size={16} /> Compose Mail
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl min-h-[500px]">
            {/* Mail List */}
            <div className="border-r border-slate-800 pr-4 space-y-2">
              <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50 mb-4">
                <Search size={15} className="text-slate-400" />
                <input type="text" placeholder="Search emails..." className="bg-transparent border-none text-xs text-white outline-none w-full" />
              </div>

              {mails.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMail(m.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
                    selectedMail === m.id 
                      ? 'bg-blue-600/15 border border-blue-500/40' 
                      : 'bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-200">{m.sender}</span>
                    <span className="text-[11px] text-slate-400">{m.time}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-blue-400 truncate mb-1">{m.subject}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{m.snippet}</p>
                </div>
              ))}
            </div>

            {/* Mail Detail Pane */}
            <div className="lg:col-span-2 pl-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">{currentMail.subject}</h2>
                    <p className="text-xs text-slate-400">From: <span className="text-slate-200 font-semibold">{currentMail.sender}</span></p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button className="p-2 hover:bg-slate-800 rounded-xl"><Star size={16} /></button>
                    <button className="p-2 hover:bg-slate-800 hover:text-red-400 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
                  <p>{currentMail.snippet}</p>
                  <p>Please review the details and let us know if additional documentation or authorization is required.</p>
                  <p className="text-slate-400 mt-6">Best regards,<br />{currentMail.sender}</p>
                </div>
              </div>

              {/* Reply Box */}
              <div className="mt-8 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                  <input type="text" placeholder={`Reply to ${currentMail.sender}...`} className="bg-transparent border-none text-xs text-white outline-none flex-1" />
                  <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all">
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
