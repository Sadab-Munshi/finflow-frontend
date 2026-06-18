export interface RollingAveragePoint {
  date: string
  dailySpend: number
  sma7: number | null
  sma30: number | null
}

export interface SeasonalityDay {
  day: string
  dayIndex: number
  averageSpend: number
  overallAverage: number
  ratio: number
}

export interface RollingAveragesResponse {
  data: {
    daily: RollingAveragePoint[]
    seasonality: SeasonalityDay[]
  }
  cached: boolean
  computed_at: string
}

export interface ForecastPoint {
  date: string
  projectedBalance: number
  lowerBound: number
  upperBound: number
}

export interface CashFlowForecastResponse {
  data: {
    projection: ForecastPoint[]
    confidence: number
    currentBalance: number
  }
  cached: boolean
  computed_at: string
}

export interface AnomalyTransaction {
  id: string
  date: string
  type: string
  amount: number
  category: string
  note: string
  zScore: number
  direction: 'high' | 'low'
}

export interface AnomalyDetectionResponse {
  data: AnomalyTransaction[]
  cached: boolean
  computed_at: string
}

export interface YoYComparison {
  current: { month: string; income: number; expense: number; savings: number; savingsRate: number }
  previous: { month: string; income: number; expense: number; savings: number; savingsRate: number }
  changes: {
    incomePct: number | null
    expensePct: number | null
    savingsPct: number | null
    savingsRateDiff: number
    incomeIsNew: boolean
    expenseIsNew: boolean
    savingsIsNew: boolean
  }
}

export interface YoYComparisonResponse {
  data: YoYComparison
  cached: boolean
  computed_at: string
}
