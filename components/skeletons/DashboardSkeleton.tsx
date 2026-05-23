import Layout from '@/components/layout/Layout'

export default function DashboardSkeleton() {
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 animate-pulse">
        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 bg-slate-200 rounded" />
          <div className="h-8 w-44 bg-slate-200 rounded-full" />
        </div>

        {/* 2. Hero Card */}
        <div className="bg-gradient-to-br from-[#0A7B7B] to-[#0D5C5C] rounded-2xl p-5 md:p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="h-4 w-28 bg-teal-400/40 rounded" />
            <div className="w-5 h-5 bg-teal-400/40 rounded" />
          </div>
          <div className="h-10 w-52 bg-teal-400/40 rounded mt-3" />
          <div className="h-3 w-20 bg-teal-400/30 rounded mt-2" />
        </div>

        {/* 3. Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-200 mb-2" />
              <div className="h-3 w-14 bg-slate-200 rounded mb-1" />
              <div className="h-2.5 w-16 bg-slate-200 rounded mb-1" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* 4. Insight Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-3 w-44 bg-slate-200 rounded" />
          </div>
          <div className="w-20 h-10 bg-slate-200 rounded flex-shrink-0 hidden sm:block" />
          <div className="w-5 h-5 bg-slate-200 rounded flex-shrink-0" />
        </div>

        {/* 5. Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-[#E2E8F0] last:border-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3.5 w-28 bg-slate-200 rounded" />
                <div className="h-2.5 w-36 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-16 bg-slate-200 rounded flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* 6. Weekly Activity Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="h-48 md:h-64 bg-slate-100 rounded-lg" />
        </div>

        {/* 7. Expense Breakdown Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="h-5 w-40 bg-slate-200 rounded mb-1" />
          <div className="h-3 w-36 bg-slate-200 rounded mb-3" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-48 rounded-full bg-slate-100" />
            <div className="w-full space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-3 w-8 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
