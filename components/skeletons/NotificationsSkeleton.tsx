export default function NotificationsSkeleton() {
  return (
    <div className="w-full bg-white min-h-screen sm:min-h-0 px-0 sm:px-4 lg:px-6 animate-pulse">
      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:py-3">
          <div className="w-9" />
          <div className="h-5 w-32 bg-slate-200 rounded-lg" />
          <div className="w-9" />
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2 sm:pb-3">
          <div className="w-full h-10 bg-slate-100 rounded-xl" />
        </div>

        {/* Filter tabs + more button */}
        <div className="flex items-center justify-between px-4 pb-2 sm:pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-slate-200 rounded-full" />
            <div className="h-8 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="w-8 h-8 bg-slate-100 rounded-full" />
        </div>
      </div>

      {/* ── Group header ───────────────────────────────────────────── */}
      <div className="bg-[#F8FAFC] px-4 py-2 border-y border-[#E2E8F0]">
        <div className="h-3 w-16 bg-slate-200 rounded" />
      </div>

      {/* ── Notification rows ──────────────────────────────────────── */}
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-3.5 border-b border-[#F1F5F9]"
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 bg-slate-200 rounded w-36" />
              <div className="w-2.5 h-2.5 bg-slate-200 rounded-full flex-shrink-0 mt-1" />
            </div>
            <div className="mt-1.5 space-y-1.5">
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
            <div className="mt-1.5">
              <div className="h-2.5 bg-slate-100 rounded w-14" />
            </div>
          </div>
        </div>
      ))}

      {/* ── Second group header ────────────────────────────────────── */}
      <div className="bg-[#F8FAFC] px-4 py-2 border-y border-[#E2E8F0]">
        <div className="h-3 w-20 bg-slate-200 rounded" />
      </div>

      {/* ── More notification rows ─────────────────────────────────── */}
      {[5, 6].map(i => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-3.5 border-b border-[#F1F5F9]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="w-2.5 h-2.5 bg-slate-200 rounded-full flex-shrink-0 mt-1" />
            </div>
            <div className="mt-1.5 space-y-1.5">
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="mt-1.5">
              <div className="h-2.5 bg-slate-100 rounded w-14" />
            </div>
          </div>
        </div>
      ))}

      {/* ── Load more button ───────────────────────────────────────── */}
      <div className="flex justify-center py-4 border-t border-slate-100">
        <div className="h-8 w-24 bg-slate-100 rounded-full" />
      </div>
    </div>
  )
}
