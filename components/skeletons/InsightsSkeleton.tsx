import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton() {
  return (
    <Layout>
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-md bg-slate-200 animate-pulse" />
            <div className="w-6 h-6 rounded-md bg-slate-200 animate-pulse" />
          </div>
          <div className="h-3.5 w-56 rounded bg-slate-100 mt-2 animate-pulse" />
          <div className="h-6 w-40 rounded-full bg-slate-100 mt-2 animate-pulse" />
        </div>

        {/* Timestamp + Refresh row */}
        <div className="flex items-center justify-between">
          <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="h-9 w-24 rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
        </div>

        {/* Card skeletons */}
        <div className="grid gap-3">
          {[140, 175, 155, 160].map((titleW, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-200 animate-pulse" />
                  <div
                    className="h-4 rounded-md bg-slate-100 animate-pulse"
                    style={{ width: titleW }}
                  />
                </div>
                <div className="h-5 w-16 rounded-full flex-shrink-0 bg-slate-100 animate-pulse" />
              </div>
              <div className="pl-10 space-y-2">
                {['92%', '76%', '50%'].map((w, j) => (
                  <div
                    key={j}
                    className="h-3 rounded-md bg-slate-100 animate-pulse"
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty-state card placeholder */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto animate-pulse" />
          <div className="h-5 w-36 rounded bg-slate-200 mt-4 mx-auto animate-pulse" />
          <div className="h-3 w-52 rounded bg-slate-100 mt-2 mx-auto animate-pulse" />
          <div className="h-3 w-44 rounded bg-slate-100 mt-2 mx-auto animate-pulse" />
          <div className="h-9 w-36 rounded-xl bg-slate-100 mt-6 mx-auto animate-pulse" />
        </div>

        {/* Disclaimer skeleton */}
        <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-2.5 w-3/4 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
