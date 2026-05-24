import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton() {
  return (
    <Layout>
      <div className="space-y-4 pb-6 animate-pulse">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 bg-slate-200 rounded" />
            <div className="w-5 h-5 bg-slate-200 rounded" />
          </div>
          <div className="h-3.5 w-56 bg-slate-200 rounded mt-2" />
          <div className="h-6 w-40 bg-slate-100 rounded-full mt-2" />
        </div>

        {/* Empty state card skeleton */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 mb-4" />
          <div className="h-5 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-3.5 w-56 bg-slate-100 rounded mb-1" />
          <div className="h-3.5 w-44 bg-slate-100 rounded mb-6" />
          <div className="h-10 w-44 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </Layout>
  )
}
