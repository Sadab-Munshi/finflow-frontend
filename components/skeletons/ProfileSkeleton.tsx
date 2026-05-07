import Layout from '@/components/layout/Layout'

export default function ProfileSkeleton() {
  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto pb-10">
        <div className="space-y-4 md:space-y-6 animate-pulse">
          {/* Hero Header */}
          <div
            className="relative overflow-hidden md:rounded-2xl md:mx-4 pt-10 pb-8"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}
          >
            <div className="w-28 h-28 rounded-full bg-teal-400/40 mx-auto mb-4" />
            <div className="h-7 w-32 bg-teal-400/40 mx-auto mb-2" />
            <div className="h-5 w-40 bg-teal-400/30 mx-auto rounded-full" />
          </div>

          {/* Stats Row */}
          <div className="px-4 -mt-4 relative z-20">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-[#ECFDF5] rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-5 h-5 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-12 bg-gray-200 rounded mb-0.5" />
                  <div className="h-3 w-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 mt-4 space-y-3">
            {/* Account Section */}
            <div>
              <div className="h-3 w-16 bg-gray-200 rounded mb-2 uppercase tracking-wider" />
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-3 w-10 bg-gray-200 rounded mb-0.5" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="w-6 h-6 bg-gray-200 rounded-xl" />
                </div>
                <div className="border-t border-gray-100" />
                <div>
                  <div className="h-3 w-10 bg-gray-200 rounded mb-0.5" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded mt-0.5" />
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-0.5" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-6 w-16 bg-gray-200 rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Integrations Section */}
            <div>
              <div className="h-3 w-24 bg-gray-200 rounded mb-2 uppercase tracking-wider" />
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-0.5" />
                      <div className="h-3 w-40 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-0.5" />
                      <div className="h-3 w-40 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-gray-200 rounded-full" />
                </div>
              </div>
            </div>

            {/* AI Usage Section */}
            <div>
              <div className="h-3 w-16 bg-gray-200 rounded mb-2 uppercase tracking-wider" />
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 w-1/2 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div>
              <div className="h-3 w-24 bg-gray-200 rounded mb-2 uppercase tracking-wider" />
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                    <div className="w-8 h-8 bg-gray-200 rounded-xl" />
                    <div className="flex-1 h-4 w-32 bg-gray-200 rounded" />
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
