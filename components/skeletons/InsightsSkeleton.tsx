import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton({ hasInsights = false }: { hasInsights?: boolean }) {
  return (
    <Layout>
      {hasInsights ? (
        // Card skeleton — shown when user has saved insights loading
        <div className="space-y-4 pb-6">
          {/* Header */}
          <div className="animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 bg-slate-200 rounded" />
              <div className="w-5 h-5 bg-slate-200 rounded" />
            </div>
            <div className="h-3.5 w-56 bg-slate-200 rounded mt-2" />
            <div className="h-6 w-40 bg-slate-100 rounded-full mt-2" />
          </div>
          {/* Timestamp + refresh row */}
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-3.5 w-48 bg-slate-100 rounded" />
            <div className="h-9 w-24 bg-slate-100 rounded-xl" />
          </div>
          {/* Card skeletons */}
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"
                style={{ borderLeft: '3px solid #E2E8F0' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 0.1}s` }} />
                    <div className="h-4 rounded-md bg-slate-100 animate-pulse" style={{ width: `${110 + i * 25}px`, animationDelay: `${i * 0.1}s` }} />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                </div>
                <div className="pl-10 space-y-2">
                  <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '92%', animationDelay: `${i * 0.1 + 0.1}s` }} />
                  <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '78%', animationDelay: `${i * 0.1 + 0.15}s` }} />
                  <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '55%', animationDelay: `${i * 0.1 + 0.2}s` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Empty state skeleton — shown on true first load
        <div className="space-y-4 pb-6 animate-pulse">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 bg-slate-200 rounded" />
              <div className="w-5 h-5 bg-slate-200 rounded" />
            </div>
            <div className="h-3.5 w-56 bg-slate-200 rounded mt-2" />
            <div className="h-6 w-40 bg-slate-100 rounded-full mt-2" />
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 mb-4" />
            <div className="h-5 w-36 bg-slate-200 rounded mb-2" />
            <div className="h-3.5 w-56 bg-slate-100 rounded mb-1" />
            <div className="h-3.5 w-44 bg-slate-100 rounded mb-6" />
            <div className="h-10 w-44 bg-slate-200 rounded-xl" />
          </div>
        </div>
      )}
    </Layout>
  )
}
