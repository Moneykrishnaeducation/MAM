"use client";

import React from 'react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100 font-sans antialiased" style={{ backgroundColor: '#0e2250' }}>
      <ClientSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <ClientHeader />
        <main className="flex-1 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
