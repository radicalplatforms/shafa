import { Logger } from '@origranot/ts-logger'

/**
 * Creates a new logger instance with a specific context tag.
 * @param {string} tag - The tag to identify the logger's context (e.g., 'App', 'ItemService').
 * @returns {Logger} A configured logger instance.
 */
export function createLogger(tag: string): Logger {
  return new Logger({
    name: `${tag}`,
    timestamps: true,
  })
}

// Export a default logger for general use
export const log = createLogger('App')
