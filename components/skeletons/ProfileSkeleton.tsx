import Layout from '@/components/layout/Layout'

function SectionTitle({ className = 'w-20' }: { className?: string }) {
  return <div className={`h-3 bg-gray-200 rounded mb-2 ${className}`} />
}

function IconCircle({ className = '' }: { className?: string }) {
  return <div className={`w-9 h-9 rounded-full bg-[#DDF7EF] flex-shrink-0 ${className}`} />
}

function Divider() {
  return <div className="border-t border-[#F1F5F9]" />
}

function ToggleSkeleton() {
  return <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
}

function SettingsRowSkeleton({ last = false }: { last?: boolean }) {
  return (
    <div className={`w-full flex items-center gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-gray-100'}`}>
      <div className="w-8 h-8 rounded-xl bg-[#DDF7EF] shrink-0" />
      <div className="h-4 w-32 bg-gray-200 rounded flex-1 max-w-[180px]" />
      <div className="w-4 h-4 bg-gray-200 rounded" />
    </div>
  )
}

export default function ProfileSkeleton() {
  return (
    <Layout>
      <div className="w-full pb-10 animate-pulse">
        {/* SECTION 1 — HERO HEADER */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', minHeight: 130 }}
        >
          {/* Geometric pattern overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="profile-skeleton-geo" width="48" height="48" patternUnits="userSpaceOnUse">
                  <circle cx="24" cy="24" r="12" fill="none" stroke="white" strokeWidth="1" />
                  <polygon points="0,0 24,0 12,20.8" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="24,0 48,0 36,20.8" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="0,48 24,48 12,27.2" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="24,48 48,48 36,27.2" fill="none" stroke="white" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#profile-skeleton-geo)" />
            </svg>
          </div>

          {/* Hero decor placeholder */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 sm:w-2/5 pointer-events-none select-none">
            <div className="absolute right-3 bottom-0 sm:top-4 sm:bottom-auto w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10" />
            <div className="absolute right-10 bottom-5 sm:top-12 sm:bottom-auto w-14 h-14 rounded-full bg-white/10" />
          </div>

          <div className="relative z-10 flex flex-row items-center gap-4 px-5 py-8">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-teal-400/40"
                style={{ boxShadow: '0 0 0 3px white, 0 0 20px rgba(255,255,255,0.3)' }}
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-white/90 rounded-full shadow-md" />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="h-5 sm:h-6 w-32 sm:w-44 bg-white/35 rounded" />
              <div
                className="h-5 w-36 sm:w-44 rounded-full"
                style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 — STATS ROW */}
        <div className="sm:px-0 px-3 mt-3 relative z-20">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 flex flex-col items-center text-center border border-[#E2E8F0] shadow-sm sm:flex-row sm:items-center sm:gap-2.5 sm:text-left sm:p-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#DDF7EF] flex-shrink-0 mb-1 sm:mb-0" />
                <div className="min-w-0 flex flex-col items-center sm:items-start">
                  <div className="h-4 w-10 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:px-0 px-3 mt-4 space-y-3">
          {/* SECTION 3 — ACCOUNT INFO */}
          <div>
            <SectionTitle className="w-16" />
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <IconCircle />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-10 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-xl" />
              </div>

              <Divider />

              <div className="flex items-center gap-3">
                <IconCircle />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-10 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-48 max-w-full bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>

              <Divider />

              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <IconCircle />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="hidden sm:flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-6 w-16 bg-gray-200 rounded-full" />
                  ))}
                </div>
                <div className="sm:hidden h-4 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* SECTION 4 — INTEGRATIONS */}
          <div>
            <SectionTitle className="w-24" />
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 space-y-4">
              {[0, 1].map((i) => (
                <div key={i}>
                  {i > 0 && <div className="border-t border-gray-100 mb-4" />}
                  <div className="flex items-center gap-3 flex-nowrap">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-36 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-44 max-w-full bg-gray-200 rounded" />
                    </div>
                    <div className="flex-shrink-0 ml-auto">
                      <ToggleSkeleton />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5 — AI USAGE */}
          <div>
            <SectionTitle className="w-14" />
            <div
              className="rounded-2xl border border-[#C6F0E8] overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #F0FDF9 0%, #E8FAF4 100%)' }}
            >
              <div className="p-4 pr-32 sm:pr-36">
                <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                <div className="space-y-1.5">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="bg-white/60 rounded-full h-3 overflow-hidden">
                    <div className="h-3 w-1/2 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="absolute right-0 bottom-0 w-28 h-28 sm:w-32 sm:h-32 pointer-events-none select-none">
                <div className="absolute right-3 bottom-3 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-teal-100/70" />
                <div className="absolute right-9 bottom-9 w-9 h-9 rounded-xl bg-teal-200/70" />
              </div>
            </div>
          </div>

          {/* SECTION 6 — SETTINGS LIST */}
          <div>
            <SectionTitle className="w-24" />
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <SettingsRowSkeleton key={i} last={i === 4} />
              ))}
            </div>
          </div>

          {/* SECTION 7 — ABOUT */}
          <div>
            <SectionTitle className="w-14" />
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-8 bg-gray-200 rounded" />
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3.5 ${i < 2 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 8 — SIGN OUT */}
          <div className="w-full flex items-center justify-center gap-2 bg-red-200 rounded-2xl py-3.5 shadow-sm">
            <div className="w-4 h-4 bg-red-300 rounded" />
            <div className="h-4 w-16 bg-red-300 rounded" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
