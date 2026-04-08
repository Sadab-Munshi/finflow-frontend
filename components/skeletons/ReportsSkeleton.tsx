import Layout from '@/components/layout/Layout'

export default function ReportsSkeleton() {
  return (
    <Layout>
      <div className="space-y-6 animate-pulse">
        {/* Page header */}
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded" />
          <div className="h-3.5 w-80 bg-gray-200 rounded mt-1" />
        </div>

        {/* Report card placeholders */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-2.5 w-40 bg-gray-200 rounded mb-1" />
                  <div className="h-2.5 w-14 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-9 w-24 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 bg-teal-200 rounded flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-full bg-teal-200 rounded" />
            <div className="h-3 w-3/4 bg-teal-200 rounded" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
