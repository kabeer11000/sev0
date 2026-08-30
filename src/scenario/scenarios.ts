import type { Scenario } from './types'
import { tutorialScenario } from './tutorial'
import { checkoutScenario } from './checkout'
import { retryStormScenario } from './retryStorm'
import { iotOeeScenario } from './iotOee'

export const SCENARIOS: Scenario[] = [tutorialScenario, checkoutScenario, retryStormScenario, iotOeeScenario]

export function getScenarioByCaseId(caseId: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.caseId.toLowerCase() === caseId.toLowerCase())
}
