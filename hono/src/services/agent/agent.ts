import { anthropic } from '@ai-sdk/anthropic'
import { Experimental_Agent as Agent, stepCountIs } from 'ai'

import type { ToolSet } from './tools'

/**
 * Create an AI agent with Claude Sonnet model and configured tools.
 *
 * @param {ToolSet} tools - The set of tools available to the agent
 * @returns {Agent} - Configured agent instance
 */
export function createAgent(tools: ToolSet) {
  console.log('[Agent] Creating agent with Claude Sonnet model and tools:', Object.keys(tools))

  const agent = new Agent({
    model: anthropic('claude-haiku-4-5-20251001'),
    tools,
    stopWhen: stepCountIs(20),
  })

  console.log('[Agent] Agent created successfully with 20 step limit')
  return agent
}
