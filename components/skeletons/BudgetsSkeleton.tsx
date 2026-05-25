export default function BudgetsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto pb-8 animate-pulse">

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

      {/* ── Hero Summary Card ─────────────────────────────────────── */}
      <div className="mx-0 mb-5 rounded-2xl bg-teal-100/60 p-5">
        {/* label + big number */}
        <div className="h-3 w-36 bg-teal-200/80 rounded mb-2" />
        <div className="h-9 w-48 bg-teal-200/80 rounded-xl mb-4" />
        {/* two stat pills */}
        <div className="flex gap-3 mb-4">
          {[1, 2].map(i => (
            <div
              key={i}
              className="flex-1 rounded-xl bg-teal-200/50 p-3"
            >
              <div className="h-2.5 w-10 bg-teal-300/60 rounded mb-2" />
              <div className="h-4 w-20 bg-teal-300/60 rounded" />
            </div>
          ))}
        </div>
        {/* progress bar area */}
        <div className="h-2.5 w-24 bg-teal-200/70 rounded mb-2" />
        <div className="h-1.5 w-full bg-teal-200/70 rounded-full" />
      </div>

      {/* ── Alert Banner (occasional) ─────────────────────────────── */}
      <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-red-200 shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-44 bg-red-200 rounded mb-1.5" />
          <div className="h-2.5 w-32 bg-red-100 rounded" />
        </div>
      </div>

      {/* ── Section label ─────────────────────────────────────────── */}
      <div className="h-3 w-20 bg-gray-200 rounded mb-3 ml-1" />

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
                {/* icon circle */}
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              </div>
              {/* action buttons */}
              <div className="flex gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100" />
                <div className="w-7 h-7 rounded-lg bg-gray-100" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mx-4 mb-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-200"
                  style={{ width: `${35 + i * 20}%` }}
                />
              </div>
            </div>

            {/* Stat cells row */}
            <div className="grid grid-cols-3 gap-2 px-4 mb-3">
              {['Budget', 'Spent', 'Left'].map(label => (
                <div key={label} className="bg-gray-50 rounded-xl p-2">
                  <div className="h-2 w-10 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3.5 w-14 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Footer: pill + pct */}
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
