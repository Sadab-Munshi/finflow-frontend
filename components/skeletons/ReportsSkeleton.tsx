import Layout from '@/components/layout/Layout'

export default function ReportsSkeleton() {
  return (
    <Layout>
      <div className="space-y-6 animate-pulse">
        {/* Page header — matches reports page title + subtitle */}
        <div className="min-w-0">
          <div className="h-7 w-44 max-w-[70%] bg-gray-200 rounded" />
          <div className="h-3.5 w-full max-w-md bg-gray-200 rounded mt-2" />
        </div>

        {/* Report rows — same card shape as loaded list */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-28 max-w-[60%] bg-gray-200 rounded" />
                  <div className="h-2.5 w-40 max-w-[80%] bg-gray-200 rounded" />
                  <div className="h-2.5 w-14 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-9 w-[6.5rem] bg-gray-200 rounded-xl shrink-0" />
            </div>
          ))}
        </div>

        {/* Info banner — same padding/shape as page, neutral only */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-3/4 max-w-sm bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
