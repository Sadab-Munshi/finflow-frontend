import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton() {
  return (
    <Layout>
      <div className="space-y-4 pb-6 animate-pulse">
        {/* Page header — title, subtitle, transaction badge */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 max-w-[50%] bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded shrink-0" />
          </div>
          <div className="h-3.5 w-full max-w-xs bg-gray-200 rounded mt-2" />
          <div className="h-6 w-40 max-w-[70%] bg-gray-200 rounded-full mt-2" />
        </div>

        {/* Last generated + refresh row */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-36 max-w-[55%] bg-gray-200 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded-xl shrink-0" />
        </div>

        {/* Insight cards — 1 col mobile, 2 col md+ like the live page */}
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { title: 'w-28', lines: ['w-[92%]', 'w-[76%]', 'w-1/2'] },
            { title: 'w-36', lines: ['w-[95%]', 'w-[82%]', 'w-[60%]'] },
            { title: 'w-32', lines: ['w-[88%]', 'w-[70%]', 'w-[45%]'] },
            { title: 'w-36', lines: ['w-[90%]', 'w-[74%]', 'w-[55%]'] },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                  <div className={`h-4 ${card.title} max-w-[70%] bg-gray-200 rounded`} />
                </div>
                <div className="h-5 w-14 bg-gray-200 rounded-full shrink-0" />
              </div>
              <div className="pl-0 sm:pl-10 space-y-2">
                {card.lines.map((w, j) => (
                  <div key={j} className={`h-3 ${w} bg-gray-200 rounded`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer — same bar as the live page */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex items-start gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-2.5 w-full bg-gray-200 rounded" />
            <div className="h-2.5 w-3/4 max-w-md bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
