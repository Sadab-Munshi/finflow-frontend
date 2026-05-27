import Layout from '@/components/layout/Layout'

function SectionLabel() {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <div className="h-3 w-32 bg-gray-200 rounded" />
      <div className="flex-1 border-b border-[#E2E8F0]" />
    </div>
  )
}

function ToggleSkeleton() {
  return <div className="w-11 h-6 bg-gray-200 rounded-full flex-shrink-0" />
}

function RowSkeleton({ last = false }: { last?: boolean }) {
  return (
    <div className={`flex items-start justify-between py-3 ${last ? '' : 'border-b border-[#F1F5F9]'}`}>
      <div className="flex-1 pr-4">
        <div className="h-4 w-32 bg-gray-200 rounded mb-1.5" />
        <div className="h-3 w-48 bg-gray-200 rounded" />
      </div>
      <ToggleSkeleton />
    </div>
  )
}

export default function SettingsSkeleton() {
  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto px-4 pb-24 animate-pulse">
        {/* Header */}
        <div className="mb-6">
          <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>

        {/* Email Notifications */}
        <SectionLabel />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton last />
        </div>

        {/* Push Notifications */}
        <SectionLabel />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <RowSkeleton />
          <div className="ml-3 pl-3 border-l-2 border-[#E2E8F0]">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton last />
          </div>
        </div>

        {/* In-App Notifications */}
        <SectionLabel />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <RowSkeleton />
          <div className="ml-3 pl-3 border-l-2 border-[#E2E8F0]">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton last />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <div className="w-4 h-4 bg-red-200 rounded" />
          <div className="h-3.5 w-28 bg-red-200 rounded" />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3">
          <div className="h-4 w-full bg-red-100 rounded mb-3" />
          <div className="h-11 w-full bg-red-200 rounded-xl" />
        </div>
      </div>
    </Layout>
  )
}
