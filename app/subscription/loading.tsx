import Layout from "@/components/layout/Layout"

export default function SubscriptionLoading() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-muted/60" />
        <div className="h-28 rounded-2xl bg-muted/40" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="h-80 rounded-2xl bg-muted/40" />
          <div className="h-80 rounded-2xl bg-muted/40" />
          <div className="h-80 rounded-2xl bg-muted/40" />
          <div className="h-80 rounded-2xl bg-muted/40" />
        </div>
      </div>
    </Layout>
  )
}
