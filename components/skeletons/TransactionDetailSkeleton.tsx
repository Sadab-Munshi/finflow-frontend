import Layout from '@/components/layout/Layout'

export default function TransactionDetailSkeleton() {
  return (
    <Layout>
      <div className="space-y-6 animate-pulse">
        {/* Back button + title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-md" />
          <div className="h-7 w-48 bg-gray-200 rounded" />
        </div>

        {/* Card */}
        <div className="border border-gray-100 rounded-lg bg-white p-6 space-y-6">
          {/* Category icon */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gray-200 mb-4" />
            {/* Amount */}
            <div className="h-10 w-40 bg-gray-200 rounded mb-2" />
            {/* Type badge */}
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>

          {/* Details grid (2x2) */}
          <div className="grid grid-cols-2 border border-gray-100 rounded-xl overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`p-3 ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'border-r' : ''} border-gray-100`}
              >
                <div className="h-2.5 w-14 bg-gray-200 rounded mb-1.5" />
                <div className="h-3.5 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="h-2.5 w-10 bg-gray-200 rounded mb-1.5" />
            <div className="h-3.5 w-48 bg-gray-200 rounded" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
