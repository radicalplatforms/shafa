import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { ollama } from 'ai-sdk-ollama'

/**
 * Parse model string to determine provider type and extract model name
 */
function parseModelString(modelString: string): {
  provider: 'anthropic' | 'openai' | 'ollama'
  modelName: string
} {
  if (modelString.startsWith('local:ollama:')) {
    const modelName = modelString.replace('local:ollama:', '')
    return { provider: 'ollama', modelName }
  }

  if (modelString.startsWith('openai:')) {
    const modelName = modelString.replace('openai:', '')
    return { provider: 'openai', modelName }
  }

  if (modelString.startsWith('anthropic:')) {
    const modelName = modelString.replace('anthropic:', '')
    return { provider: 'anthropic', modelName }
  }

  throw new Error(`Invalid model string: ${modelString}`)
}

/**
 * Get AI SDK model instance based on model string
 */
export function getModel(modelString: string): LanguageModel {
  const { provider, modelName } = parseModelString(modelString)

  if (provider === 'ollama') {
    return ollama(modelName)
  }

  if (provider === 'openai') {
    return openai(modelName)
  }

  if (provider === 'anthropic') {
    return anthropic(modelName)
  }

  throw new Error(`Invalid model provider: ${provider}`)
}

/**
 * Get low-complexity model for routing and classification tasks
 *
 * @throws {Error} When AI_LOW_MODEL environment variable is not set
 */
export function getLowModel(): LanguageModel {
  const modelString = process.env.AI_LOW_MODEL
  if (!modelString) {
    throw new Error('AI_LOW_MODEL environment variable is required but not set')
  }
  return getModel(modelString)
}

/**
 * Get medium-complexity model for main agent tasks
 *
 * @throws {Error} When AI_MEDIUM_MODEL environment variable is not set
 */
export function getMediumModel(): LanguageModel {
  const modelString = process.env.AI_MEDIUM_MODEL
  if (!modelString) {
    throw new Error(
      'AI_MEDIUM_MODEL environment variable is required but not set'
    )
  }
  return getModel(modelString)
}
