import type { ProviderStatus } from '@/types'

export type ProviderCoverage = {
  attempted: number
  successful: number
  confirmedItems: number
  noMatch: number
  unavailable: number
  failed: number
  limited: boolean
}

export function summarizeProviderCoverage(statuses: ProviderStatus[]): ProviderCoverage {
  const attemptedStatuses = statuses.filter(status => status.status !== 'skipped')
  const successfulStatuses = attemptedStatuses.filter(status =>
    status.status === 'completed' || status.status === 'no_match'
  )

  return {
    attempted: attemptedStatuses.length,
    successful: successfulStatuses.length,
    confirmedItems: attemptedStatuses.reduce((total, status) => total + status.item_count, 0),
    noMatch: attemptedStatuses.filter(status => status.status === 'no_match').length,
    unavailable: attemptedStatuses.filter(status => status.status === 'unavailable').length,
    failed: attemptedStatuses.filter(status => status.status === 'failed').length,
    limited: attemptedStatuses.some(status =>
      status.status === 'unavailable' || status.status === 'failed'
    ),
  }
}
