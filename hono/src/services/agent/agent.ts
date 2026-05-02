import { Experimental_Agent as Agent, stepCountIs } from 'ai'

import { createLogger } from '../../utils/logger'
import { getMediumModel } from '../../utils/model-provider'
import type { ToolSet } from './tools'

const logger = createLogger('AgentService')
const STEP_LIMIT = 20

/**
 * Create an AI agent with configured model and tools.
 *
 * @param {ToolSet} tools - The set of tools available to the agent
 * @returns {Agent} - Configured agent instance
 */
export function createAgent(tools: ToolSet) {
  const model = getMediumModel()
  const toolCount = Object.keys(tools).length
  const toolNames = Object.keys(tools).join(',')

  const agent = new Agent({
    model,
    tools,
    stopWhen: stepCountIs(STEP_LIMIT),
  })

  logger.debug(`Agent created (${toolCount} tools: ${toolNames}, limit:${STEP_LIMIT})`)

  return agent
}
