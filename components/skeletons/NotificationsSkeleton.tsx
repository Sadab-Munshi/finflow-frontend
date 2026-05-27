export default function NotificationsSkeleton() {
  return (
    <div className="w-full bg-white min-h-screen">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-40 bg-gray-200 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-24 bg-gray-200 rounded-xl" />
          <div className="h-7 w-16 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        <div className="h-9 w-14 bg-gray-200 rounded-xl" />
        <div className="h-9 w-24 bg-gray-200 rounded-xl" />
      </div>

      {/* ── Notification cards ──────────────────────────────────────── */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-4"
          >
            {/* Card header */}
            <div className="flex items-start gap-3 mb-3">
              {/* type icon */}
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-4 bg-gray-200 rounded w-44" />
                  <div className="h-3 w-10 bg-gray-100 rounded flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className="pl-12 mb-3 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <div className="h-5 w-24 bg-gray-100 rounded-full" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-gray-100 rounded" />
                <div className="w-7 h-7 bg-gray-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
