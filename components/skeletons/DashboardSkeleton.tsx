import Layout from '@/components/layout/Layout'

/**
 * Loading skeleton for the dashboard.
 *
 * Shape rules — the skeleton must sit exactly where the real content lands, so
 * nothing jumps when data arrives:
 *   • the same shell: max-w-[1440px], stacked on phones, a 3-column grid at lg
 *   • the same section order and col-spans (hero 1, summary 2, insight 3,
 *     chart 2 + breakdown 1, transactions 3)
 *
 * Colour rules — a skeleton is a wireframe, not a preview. Every surface is
 * white, every placeholder is the neutral slate ramp, and there is not a single
 * teal/red/violet pixel: tinted bars make the page look "loaded but wrong"
 * while it is still fetching, and they fight the real colours on arrival.
 */
export default function DashboardSkeleton() {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1440px] space-y-4 md:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 animate-pulse">

        {/* 1. Header — title + month/all-time toggle */}
        <div className="flex items-center justify-between lg:order-1 lg:col-span-3">
          <div className="h-7 w-36 rounded bg-slate-200" />
          <div className="h-8 w-44 rounded-full border border-[#E2E8F0] bg-white" />
        </div>

        {/* 2. Hero Card — neutral card, same box the teal balance card fills */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 md:p-6 lg:order-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-5 w-5 rounded bg-slate-200" />
          </div>
          <div className="mt-3 h-10 w-52 max-w-full rounded bg-slate-200" />
          <div className="mt-2 h-3 w-20 rounded bg-slate-200" />
        </div>

        {/* 3. Summary Cards — income / expenses / saving */}
        <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-3 lg:order-2 lg:col-span-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex h-full flex-col items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5 text-center sm:rounded-2xl sm:p-3"
            >
              <div className="mb-2 h-8 w-8 rounded-full bg-slate-200 sm:h-9 sm:w-9" />
              <div className="h-2.5 w-12 rounded bg-slate-200" />
              <div className="mt-1 h-3.5 w-14 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* 4. Insight Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 lg:order-3 lg:col-span-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-4 w-36 max-w-full rounded bg-slate-200" />
            <div className="h-3 w-44 max-w-full rounded bg-slate-200" />
          </div>
          <div className="hidden h-10 w-20 flex-shrink-0 rounded bg-slate-200 sm:block" />
          <div className="h-5 w-5 flex-shrink-0 rounded bg-slate-200" />
        </div>

        {/* 5. Recent Transactions */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-5 lg:order-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[#E2E8F0] py-3 last:border-0"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-28 max-w-full rounded bg-slate-200" />
                <div className="h-2.5 w-36 max-w-full rounded bg-slate-200" />
              </div>
              <div className="h-4 w-16 flex-shrink-0 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* 6. Weekly Activity Chart */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-5 lg:order-4 lg:col-span-2">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-200" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
          </div>
          <div className="mt-6 h-[220px] w-full rounded-lg bg-slate-100 sm:h-[260px] md:h-[340px] lg:h-[360px]" />
        </div>

        {/* 7. Expense Breakdown */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-5 lg:order-4 lg:col-span-1">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="mb-3 mt-2 h-3 w-36 rounded bg-slate-200" />
          <div className="flex flex-col items-center gap-4">
            <div className="h-56 w-56 rounded-full bg-slate-100" />
            <div className="w-full space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-slate-200" />
                    <div className="h-3 w-20 rounded bg-slate-200" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 rounded bg-slate-200" />
                    <div className="h-3 w-8 rounded bg-slate-200" />
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
