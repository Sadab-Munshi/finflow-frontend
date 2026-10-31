import Layout from '@/components/layout/Layout'
import BudgetsSkeleton from '@/components/skeletons/BudgetsSkeleton'

export default function BudgetsLoading() {
  // hideFab matches the page itself, so the add button does not blink on
  // during the load and off again when the data lands.
  return <Layout hideFab><BudgetsSkeleton /></Layout>
}
