import Layout from '@/components/layout/Layout'

/**
 * Loading skeleton for /insights.
 *
 * Follows the live card geometry exactly — max-w-[1280px] page cap, 1 / 2-column
 * grid with the xl gutter, 36px round icon tile, badge in the top-right, and a
 * body that starts at the card edge (no indent under the icon). The 3px left
 * rule is drawn in grey here: the skeleton shows where the accent edge will be
 * without borrowing any insight colour.
 */
export default function InsightsSkeleton() {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-6 animate-pulse">
        {/* Page header — title, subtitle, transaction badge */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 max-w-[50%] rounded bg-slate-200" />
            <div className="h-6 w-6 shrink-0 rounded bg-slate-200" />
          </div>
          <div className="mt-2 h-3.5 w-full max-w-xs rounded bg-slate-200" />
          <div className="mt-2 h-6 w-40 max-w-[70%] rounded-full bg-slate-200" />
        </div>

        {/* Last generated + refresh row */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-36 max-w-[55%] rounded bg-slate-200" />
          <div className="h-10 w-24 shrink-0 rounded-xl bg-slate-200" />
        </div>

        {/* Insight cards — same grid, same gaps as the live page */}
        <div className="grid gap-3 md:grid-cols-2 xl:gap-4">
          {[
            { title: 'w-40', lines: ['w-[92%]', 'w-[76%]', 'w-1/2'] },
            { title: 'w-48', lines: ['w-[95%]', 'w-[82%]', 'w-[60%]'] },
            { title: 'w-44', lines: ['w-[88%]', 'w-[70%]', 'w-[45%]'] },
            { title: 'w-48', lines: ['w-[90%]', 'w-[74%]', 'w-[55%]'] },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E7EDEC] bg-white p-3.5 sm:p-4 md:p-[18px] xl:p-6"
              style={{ borderLeft: '3px solid #E2E8F0' }}
            >
              {/* Icon · title · badge */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                  <div className={`mt-1.5 h-4 ${card.title} max-w-[70%] rounded bg-slate-200`} />
                </div>
                <div className="mt-1 h-5 w-14 shrink-0 rounded-full bg-slate-200" />
              </div>

              {/* Body — full card width, no indent */}
              <div className="mt-2 space-y-2 md:mt-2.5 xl:mt-3">
                {card.lines.map((w, j) => (
                  <div key={j} className={`h-3 ${w} rounded bg-slate-200`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer — same bar as the live page */}
        <div className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-full rounded bg-slate-200" />
            <div className="h-2.5 w-3/4 max-w-md rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
