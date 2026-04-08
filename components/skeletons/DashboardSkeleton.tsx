import Layout from '@/components/layout/Layout'

export default function DashboardSkeleton() {
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 animate-pulse">
        {/* Page title */}
        <div className="h-7 w-32 bg-gray-200 rounded" />

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 rounded-lg p-4 md:p-6 shadow-xl">
          <div className="h-3 w-24 bg-teal-400/40 rounded mb-2" />
          <div className="h-9 w-48 bg-teal-400/40 rounded mt-1 md:mt-2" />
          <div className="h-3 w-16 bg-teal-400/30 rounded mt-1" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl shadow-sm p-3 flex flex-col items-center bg-white">
              <div className="h-3 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-2.5 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-14 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 md:p-4 rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div className="h-2.5 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Weekly Activity Chart */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 md:p-6 pb-2">
            <div className="h-5 w-36 bg-gray-200 rounded" />
          </div>
          <div className="p-2 md:p-6 pt-0">
            <div className="h-48 md:h-64 bg-gray-100 rounded" />
          </div>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 md:p-6 pb-2">
            <div className="h-5 w-44 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-36 bg-gray-200 rounded" />
          </div>
          <div className="p-2 md:p-6 pt-0 flex flex-col items-center gap-4">
            <div className="w-48 h-48 rounded-full bg-gray-100" />
            <div className="w-full space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="h-3 w-8 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 md:p-6 pb-2 flex items-center justify-between">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3.5 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-2.5 w-36 bg-gray-200 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
