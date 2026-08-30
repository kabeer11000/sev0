import type { Scenario } from './types'
import { checkoutScenario } from './checkout'
import { retryStormScenario } from './retryStorm'
import { iotOeeScenario } from './iotOee'

export const SCENARIOS: Scenario[] = [checkoutScenario, retryStormScenario, iotOeeScenario]

export function getScenarioByCaseId(caseId: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.caseId.toLowerCase() === caseId.toLowerCase())
}
