export default function SettingsSkeleton() {
  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 px-4 sm:px-6 lg:px-8 pb-24 animate-pulse">
      {/* Header — full width */}
      <div className="xl:col-span-2">
        <div className="mb-6">
          <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Email Notifications */}
      <div>
        <div className="flex items-center gap-2 mt-6 mb-3">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`flex items-start justify-between py-3 ${i < 2 ? 'border-b border-[#F1F5F9]' : ''}`}>
              <div className="flex-1 pr-4">
                <div className="h-4 w-32 bg-gray-200 rounded mb-1.5" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
              <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Push Notifications */}
      <div>
        <div className="flex items-center gap-2 mt-6 mb-3">
          <div className="h-3 w-36 bg-gray-200 rounded" />
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <div className="h-4 w-44 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-52 bg-gray-200 rounded" />
            </div>
            <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          </div>
          <div className="ml-3 pl-3 border-l-2 border-[#E2E8F0]">
            {[0, 1, 2].map(i => (
              <div key={i} className={`flex items-start justify-between py-3 ${i < 2 ? 'border-b border-[#F1F5F9]' : ''}`}>
                <div className="flex-1 pr-4">
                  <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3 w-44 bg-gray-200 rounded" />
                </div>
                <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* In-App Notifications */}
      <div>
        <div className="flex items-center gap-2 mt-6 mb-3">
          <div className="h-3 w-40 bg-gray-200 rounded" />
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <div className="h-4 w-40 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
            <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          </div>
          <div className="ml-3 pl-3 border-l-2 border-[#E2E8F0]">
            {[0, 1, 2].map(i => (
              <div key={i} className={`flex items-start justify-between py-3 ${i < 2 ? 'border-b border-[#F1F5F9]' : ''}`}>
                <div className="flex-1 pr-4">
                  <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3 w-44 bg-gray-200 rounded" />
                </div>
                <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone — full width */}
      <div className="xl:col-span-2">
        <div className="flex items-center gap-2 mt-6 mb-3">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-3.5 w-28 bg-gray-200 rounded" />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3">
          <div className="h-4 w-full bg-gray-200 rounded mb-3" />
          <div className="h-11 w-full bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
