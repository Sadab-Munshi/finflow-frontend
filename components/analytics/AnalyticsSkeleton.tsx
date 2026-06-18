'use client'

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-3.5 w-56 bg-slate-100 rounded mt-2 animate-pulse" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rolling averages skeleton */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
          <div className="h-4 w-36 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-slate-100 rounded animate-pulse mb-4" />
          <div className="h-[280px] bg-slate-50 rounded-xl animate-pulse" />
        </div>

        {/* Seasonality skeleton */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-44 bg-slate-100 rounded animate-pulse mb-4" />
          <div className="h-[280px] bg-slate-50 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* YoY skeleton */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
        <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mb-3" />
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          <div className="w-3 h-3 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 flex flex-col items-center gap-2">
              <div className="h-3 w-14 bg-slate-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly skeleton */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA]">
              <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
