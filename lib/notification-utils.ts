export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'budget_alert': return 'budget-alert.png'
    case 'transaction': return 'transaction.png'
    case 'report': return 'report.png'
    case 'system': return 'bell.png'
    default: return 'bell.png'
  }
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
