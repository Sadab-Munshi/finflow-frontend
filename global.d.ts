// next-intl type augmentation: invalid message keys become compile-time
// errors. Shape mirrors the en/ namespace files.
/* eslint-disable @typescript-eslint/consistent-type-imports */
type Common = typeof import('./messages/en/common.json')
type Nav = typeof import('./messages/en/nav.json')
type History = typeof import('./messages/en/history.json')
type Transaction = typeof import('./messages/en/transaction.json')
type Budgets = typeof import('./messages/en/budgets.json')
type Insights = typeof import('./messages/en/insights.json')
type Reports = typeof import('./messages/en/reports.json')

declare global {
  interface IntlMessages {
    common: Common
    nav: Nav
    history: History
    transaction: Transaction
    budgets: Budgets
    insights: Insights
    reports: Reports
  }
}

export {}
