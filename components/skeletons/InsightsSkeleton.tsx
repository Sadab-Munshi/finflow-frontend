import Layout from '@/components/layout/Layout'

export default function InsightsSkeleton({ hasInsights = false }: { hasInsights?: boolean }) {
  return (
    <Layout>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {hasInsights ? (
        // Card skeleton — shown when user has saved insights (most common case)
        <div className="space-y-4 pb-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-3.5 w-52 bg-slate-100 rounded mt-2 animate-pulse" />
            <div className="h-6 w-36 bg-[#F0FDF9] rounded-full mt-2 animate-pulse" />
          </div>

          {/* Timestamp + Refresh row */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-44 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 w-24 bg-[#F0FDF9] border border-[#0A7B7B]/20 rounded-xl animate-pulse" />
          </div>

          {/* Card skeletons */}
          <div className="grid gap-3">
            {[
              { titleW: 140, lines: ['92%', '76%', '50%'], borderColor: '#00b894' },
              { titleW: 175, lines: ['95%', '82%', '60%'], borderColor: '#ef4444' },
              { titleW: 155, lines: ['88%', '70%', '45%'], borderColor: '#10b981' },
              { titleW: 160, lines: ['90%', '74%', '55%'], borderColor: '#8b5cf6' },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
                style={{ borderLeft: `3px solid ${card.borderColor}40` }}
              >
                <div
                  className="p-4"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(248,250,252,0.8) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: `shimmer 2s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  {/* Top row: icon + title + badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse"
                        style={{
                          backgroundColor: `${card.borderColor}25`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                      <div
                        className="h-4 rounded-md bg-slate-100 animate-pulse"
                        style={{
                          width: card.titleW,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    </div>
                    <div
                      className="h-5 w-16 rounded-full flex-shrink-0 animate-pulse"
                      style={{
                        backgroundColor: `${card.borderColor}20`,
                        animationDelay: `${i * 0.1 + 0.05}s`,
                      }}
                    />
                  </div>

                  {/* Description lines */}
                  <div className="pl-10 space-y-2">
                    {card.lines.map((w, j) => (
                      <div
                        key={j}
                        className="h-3 rounded-md bg-slate-100 animate-pulse"
                        style={{
                          width: w,
                          animationDelay: `${i * 0.1 + j * 0.07}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer skeleton */}
          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-2.5 w-3/4 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>

        </div>
      ) : (
        // Empty state skeleton — true first load, no insights ever generated
        <div className="space-y-4 pb-6 animate-pulse">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 bg-slate-200 rounded" />
              <div className="w-5 h-5 bg-slate-200 rounded" />
            </div>
            <div className="h-3.5 w-56 bg-slate-200 rounded mt-2" />
            <div className="h-6 w-40 bg-slate-100 rounded-full mt-2" />
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 mb-4" />
            <div className="h-5 w-36 bg-slate-200 rounded mb-2" />
            <div className="h-3.5 w-56 bg-slate-100 rounded mb-1" />
            <div className="h-3.5 w-44 bg-slate-100 rounded mb-6" />
            <div className="h-10 w-44 bg-slate-200 rounded-xl" />
          </div>
        </div>
      )}
    </Layout>
  )
}
