import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton() {
  return (
    <Layout>
      <div className="space-y-3 px-4 animate-pulse">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded" />
          </div>
          <div className="h-3.5 w-52 bg-gray-200 rounded mt-1" />
        </div>

        {/* Generate button placeholder */}
        <div className="h-12 w-full bg-gray-200 rounded-xl" />

        {/* Empty state card */}
        <div className="rounded-xl border border-gray-100 bg-white p-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-4" />
          <div className="h-5 w-52 bg-gray-200 rounded mb-2" />
          <div className="h-3.5 w-72 bg-gray-200 rounded" />
        </div>
      </div>
    </Layout>
  )
}
