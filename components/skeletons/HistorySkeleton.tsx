import Layout from '@/components/layout/Layout'

export default function HistorySkeleton() {
  return (
    <Layout>
      <div className="space-y-3">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* Filter / type row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="h-7 w-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-7 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Search/filters area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>
          <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* Transaction list card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-3.5 w-28 bg-gray-200 rounded mb-1.5 animate-pulse" />
                  <div className="h-2.5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="h-3.5 w-16 bg-gray-200 rounded mb-1 animate-pulse" />
                  <div className="h-2.5 w-14 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 pb-4">
          <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
    </Layout>
  )
}
