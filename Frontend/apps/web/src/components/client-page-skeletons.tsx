import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ambientOrbs = (
  <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
    <div className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
    <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-indigo-600/8 blur-[90px]" />
  </div>
);

const bar = (className: string) => <Skeleton className={`rounded-full bg-white/10 ${className}`} />;

const cardShell = (className: string, children: React.ReactNode) => (
  <div className={`rounded-[2rem] border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl ${className}`}>{children}</div>
);

const tableSkeleton = (columns: number, rows: number, className = '') => (
  <div className={`overflow-hidden rounded-[1.75rem] border border-blue-800/40 bg-[#091948]/70 ${className}`}>
    <div className="grid gap-4 border-b border-blue-800/30 px-6 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="flex items-center">
          {bar(index === 0 ? 'h-3.5 w-20' : index === columns - 1 ? 'h-3.5 w-16' : 'h-3.5 w-24')}
        </div>
      ))}
    </div>
    <div className="divide-y divide-blue-800/20">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-4 px-6 py-5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, col) => (
            <div key={col} className="flex items-center">
              {bar(col === 0 ? 'h-4 w-3/4' : col === columns - 1 ? 'h-4 w-20' : 'h-4 w-2/3')}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const actionRowSkeleton = (count: number) => (
  <div className="flex flex-col gap-3 sm:flex-row">
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton
        key={index}
        className={`h-12 rounded-[28px] bg-white/10 ${index === count - 1 ? 'sm:w-44' : 'sm:w-48'}`}
      />
    ))}
  </div>
);

export function DashboardSkeleton() {
  return (
    <div className="relative p-6 md:p-8 space-y-8 overflow-hidden">
      {ambientOrbs}

      {actionRowSkeleton(3)}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-3xl border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
              <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
            </div>
            <div className="space-y-3">
              {bar('h-3.5 w-28')}
              {bar('h-9 w-40')}
              {bar('h-3.5 w-36')}
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
        <div className="flex items-center justify-between border-b border-blue-800/30 p-8">
          <div className="space-y-3">
            {bar('h-6 w-56')}
            {bar('h-3.5 w-72')}
          </div>
          {bar('h-9 w-36')}
        </div>
        <div className="p-6">
          {tableSkeleton(4, 5)}
        </div>
      </section>
    </div>
  );
}

export function InvestmentsSkeleton() {
  return (
    <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
      {ambientOrbs}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-[2rem] border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
              <Skeleton className="h-6 w-14 rounded-full bg-white/10" />
            </div>
            <div className="space-y-3">
              {bar('h-3.5 w-28')}
              {bar('h-9 w-36')}
              {bar('h-3.5 w-44')}
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-blue-800/30 p-8">
          <Skeleton className="h-8 w-2 rounded-full bg-white/10" />
          {bar('h-6 w-40')}
        </div>
        <div className="p-6">
          {tableSkeleton(8, 5)}
        </div>
      </section>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="relative p-6 md:p-10 space-y-8 overflow-hidden">
      {ambientOrbs}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-[32px] border border-blue-900/45 bg-[#0d1a40]/80 p-5 md:p-6 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
          <div className="mb-5 flex flex-wrap gap-3 border-b border-blue-900/30 pb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-28 rounded-xl bg-white/10" />
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-blue-900/35 bg-[#0b1533]/75 p-4 md:p-5">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-28 w-28 rounded-[32px] bg-white/10" />
                <div className="space-y-3 text-center">
                  {bar('mx-auto h-6 w-36')}
                  {bar('mx-auto h-5 w-28')}
                </div>
              </div>

              <div className="my-6 h-px bg-blue-900/35" />

              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    {bar('h-4 w-24')}
                    {bar('h-4 w-32')}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-blue-900/35 bg-[#0c1d47]/70 p-4">
                <div className="space-y-3">
                  {bar('h-4 w-40')}
                  {bar('h-4 w-full')}
                  {bar('h-4 w-5/6')}
                  {bar('h-4 w-full')}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-blue-900/35 bg-[#0b1533]/75 p-4 md:p-5">
              <div className="mb-5 flex gap-3 overflow-x-auto">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-32 rounded-xl bg-white/10" />
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    {bar('h-3.5 w-28')}
                    <Skeleton className="h-12 rounded-2xl bg-white/10" />
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-blue-900/35 bg-[#0c1d47]/70 p-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="space-y-3">
                    {bar('h-4 w-56')}
                    {bar('h-4 w-5/6')}
                  </div>
                  <Skeleton className="h-20 w-28 rounded-2xl bg-white/10" />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Skeleton className="h-12 w-32 rounded-2xl bg-white/10" />
                <Skeleton className="h-12 w-40 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function TicketsSkeleton() {
  return (
    <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
      {ambientOrbs}

      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="flex justify-center">
          <div className="space-y-3 text-center">
            {bar('mx-auto h-10 w-64')}
            {bar('mx-auto h-4 w-96')}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-28 rounded-[1.75rem] bg-white/10" />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl lg:justify-end">
            <Skeleton className="h-12 flex-1 rounded-[1.1rem] bg-white/10" />
            <Skeleton className="h-12 w-12 rounded-[1rem] bg-white/10" />
            <Skeleton className="h-12 w-36 rounded-[1rem] bg-white/10" />
          </div>
        </div>

        <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
          <div className="border-b border-blue-800/30 p-8">
            <div className="space-y-3">
              {bar('h-6 w-40')}
              {bar('h-4 w-72')}
            </div>
          </div>
          <div className="p-6">
            {tableSkeleton(5, 6)}
          </div>
        </section>
      </div>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="relative p-6 md:p-10 space-y-8 overflow-hidden">
      {ambientOrbs}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-32 rounded-[1.5rem] bg-white/10" />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-12 rounded-[1.1rem] bg-white/10 md:col-span-1" />
          <Skeleton className="h-12 rounded-[1.1rem] bg-white/10 md:col-span-1" />
          <Skeleton className="h-12 rounded-[1.1rem] bg-white/10 md:col-span-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-3xl border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
              <Skeleton className="h-6 w-14 rounded-full bg-white/10" />
            </div>
            <div className="space-y-3">
              {bar('h-3.5 w-24')}
              {bar('h-9 w-32')}
              {bar('h-3.5 w-40')}
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
        <div className="flex items-center justify-between border-b border-blue-800/30 p-8">
          <div className="space-y-3">
            {bar('h-6 w-48')}
            {bar('h-4 w-60')}
          </div>
          {bar('h-9 w-36')}
        </div>
        <div className="p-6">
          {tableSkeleton(6, 6)}
        </div>
      </section>
    </div>
  );
}

export function ManagerSkeleton() {
  return (
    <div className="relative overflow-hidden p-6 md:p-10 space-y-10">
      {ambientOrbs}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            {bar('h-4 w-40')}
            <Skeleton className="h-12 w-full max-w-xl rounded-[1.1rem] bg-white/10" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
            <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
          </div>
        </div>

        <section className="rounded-[2rem] border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-4 md:w-[300px]">
              <Skeleton className="h-28 w-28 rounded-[28px] bg-white/10" />
              <div className="space-y-2 text-center">
                {bar('mx-auto h-7 w-40')}
                {bar('mx-auto h-4 w-28')}
              </div>
              <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
            </div>

            <div className="min-w-0 flex-1 space-y-5">
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-40 rounded-xl bg-white/10" />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Skeleton className="h-4 w-14 rounded-full bg-white/10" />
                    <Skeleton className="mt-3 h-7 w-16 rounded-full bg-white/10" />
                    <Skeleton className="mt-3 h-3 w-20 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 md:col-span-1">
                  <div className="space-y-3">
                    {bar('h-4 w-32')}
                    {bar('h-8 w-24')}
                    {bar('h-4 w-20')}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <div className="space-y-3">
                    {bar('h-4 w-40')}
                    {bar('h-8 w-32')}
                    {bar('h-4 w-56')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-800/30 p-8">
            <div className="space-y-3">
              {bar('h-6 w-44')}
              {bar('h-4 w-64')}
            </div>
            {bar('h-9 w-28')}
          </div>
          <div className="p-6">
            {tableSkeleton(7, 5)}
          </div>
          <div className="flex flex-col gap-4 border-t border-blue-800/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-5 w-56 rounded-full bg-white/10" />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Skeleton className="h-8 w-20 rounded-lg bg-white/10" />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-8 rounded-lg bg-white/10" />
              ))}
              <Skeleton className="h-8 w-20 rounded-lg bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AvailableSkeleton() {
  return (
    <div className="relative overflow-hidden p-6 md:p-10 space-y-10">
      {ambientOrbs}

      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="space-y-3 text-center">
            {bar('mx-auto h-10 w-72')}
            {bar('mx-auto h-4 w-96')}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-[2rem] border border-blue-800/40 bg-[#0b183f]/80 p-5 shadow-2xl"
            >
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
              {bar('h-3.5 w-28')}
              <div className="mt-4 flex items-end gap-2">
                <Skeleton className="h-10 w-28 rounded-full bg-white/10" />
                <Skeleton className="h-4 w-12 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            {bar('h-4 w-40')}
            <Skeleton className="h-12 w-full max-w-xl rounded-[1.1rem] bg-white/10" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
            <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
          </div>
        </div>

        <section className="rounded-[2rem] border border-blue-800/40 bg-[#0b183f]/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-4 md:w-[300px]">
              <Skeleton className="h-28 w-28 rounded-[28px] bg-white/10" />
              <div className="space-y-2 text-center">
                {bar('mx-auto h-7 w-40')}
                {bar('mx-auto h-4 w-28')}
              </div>
              <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
            </div>

            <div className="min-w-0 flex-1 space-y-5">
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-40 rounded-xl bg-white/10" />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Skeleton className="h-4 w-14 rounded-full bg-white/10" />
                    <Skeleton className="mt-3 h-7 w-16 rounded-full bg-white/10" />
                    <Skeleton className="mt-3 h-3 w-20 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-blue-800/40 bg-[#0b183f]/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-800/30 p-8">
            <div className="space-y-3">
              {bar('h-6 w-44')}
              {bar('h-4 w-64')}
            </div>
            {bar('h-9 w-28')}
          </div>
          <div className="p-6">
            {tableSkeleton(8, 5)}
          </div>
          <div className="flex flex-col gap-4 border-t border-blue-800/30 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-5 w-56 rounded-full bg-white/10" />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Skeleton className="h-8 w-20 rounded-lg bg-white/10" />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-8 rounded-lg bg-white/10" />
              ))}
              <Skeleton className="h-8 w-20 rounded-lg bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
