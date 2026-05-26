export default function BudgetsSkeleton() {
  return (
    <div className="w-full pb-8 animate-pulse">

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-28 bg-gray-200 rounded-xl" />
        <div className="h-9 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* ── Month Navigation ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-5 w-28 bg-gray-200 rounded-lg" />
        <div className="w-8 h-8 rounded-full bg-gray-200" />
      </div>

      {/* ── Hero Summary Card (Concept D shape) ───────────────────── */}
      <div className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Header row: amount + badge */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>

        {/* Segmented bar */}
        <div className="h-2.5 w-full bg-gray-200 rounded-full mb-2.5" />

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-gray-200" />
            <div className="h-2.5 w-24 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Stat cells */}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="h-2.5 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section label ─────────────────────────────────────────── */}
      <div className="h-3 w-20 bg-gray-200 rounded mb-3 ml-0.5" />

      {/* ── Budget Cards ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
          >
            {/* Card header */}
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100" />
                <div className="w-7 h-7 rounded-lg bg-gray-100" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mx-4 mb-3">
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-200"
                  style={{ width: `${30 + i * 18}%` }}
                />
              </div>
            </div>

            {/* Stat cells */}
            <div className="grid grid-cols-3 gap-2 px-4 mb-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="bg-gray-50 rounded-xl p-2">
                  <div className="h-2 w-8 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3.5 w-14 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
              <div className="h-3 w-12 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
