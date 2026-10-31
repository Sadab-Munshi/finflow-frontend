/**
 * Loading skeleton for /budgets.
 *
 * Mirrors the live page box-for-box: max-w-[1240px], heading row with the month
 * stepper and the create button (both 44px tall so the row height does not
 * change on load), the bordered summary block, then the 1 / 2 / 3-column card
 * grid with the same card anatomy (category row, spent-of line, 8px track,
 * status row).
 *
 * Neutral only: white surfaces, gray placeholders. No category colours, no
 * progress-bar accent colours — the real card is the only thing that should
 * carry colour.
 */
export default function BudgetsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1240px] pb-6 md:pb-8 animate-pulse">

      {/* ── Heading · month · create ─────────────────────────────────── */}
      <div className="mb-1.5 flex flex-col gap-1.5 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="h-[22px] w-28 rounded bg-gray-200 sm:h-8 sm:w-32" />
          <div className="mt-1.5 h-3.5 w-52 max-w-full rounded bg-gray-200" />
        </div>

        {/* Month stepper + create share one row, same 44px height as the live controls */}
        <div className="flex items-center gap-2 sm:shrink-0">
          <div className="h-11 flex-1 rounded-lg border border-gray-300 bg-white sm:w-44 sm:flex-none" />
          <div className="h-11 w-24 rounded-lg bg-gray-200 sm:w-32" />
        </div>
      </div>

      {/* ── Summary: Spent / Total budget / Remaining ────────────────── */}
      <section className="mb-2.5 rounded-xl border border-gray-300 bg-white sm:mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={
                'px-3 py-1.5 sm:px-5 sm:py-4' +
                (i === 1 ? ' border-l border-gray-200' : '') +
                (i === 2 ? ' col-span-2 border-t border-gray-200 sm:col-span-1 sm:border-l sm:border-t-0' : '')
              }
            >
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="mt-1.5 h-6 w-24 rounded bg-gray-200 sm:mt-2" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Count label ──────────────────────────────────────────────── */}
      <div className="mb-1 h-3 w-16 rounded bg-gray-200 sm:mb-2" />

      {/* ── Budget cards: 1 col, 2 from sm, 3 only at xl ─────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-gray-300 bg-white p-3 sm:p-4"
          >
            {/* Category name + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="mt-1 h-4 w-4 shrink-0 rounded bg-gray-200" />
                <div className="h-4 w-24 max-w-full rounded bg-gray-200" />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="h-8 w-8 rounded-lg bg-gray-100" />
                <div className="h-8 w-8 rounded-lg bg-gray-100" />
              </div>
            </div>

            {/* Spent of limit */}
            <div className="mt-2 h-4 w-40 max-w-full rounded bg-gray-200" />

            {/* Progress track */}
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-300"
                style={{ width: `${34 + i * 11}%` }}
              />
            </div>

            {/* Status + drill-down */}
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <div className="h-3 w-28 max-w-full rounded bg-gray-200" />
              <div className="h-3 w-16 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
