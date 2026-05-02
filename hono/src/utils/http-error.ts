/**
 * Custom error class for HTTP errors with status codes.
 * Used throughout the application to throw errors that should be returned
 * as HTTP responses with specific status codes.
 *
 * @example
 * ```ts
 * throw new HTTPError(404, 'Resource not found')
 * throw new HTTPError(400, 'Invalid input')
 * ```
 */
export class HTTPError extends Error {
  /**
   * HTTP status code for the error response.
   */
  public status: number

  /**
   * Creates a new HTTPError instance.
   *
   * @param status - HTTP status code (e.g., 400, 401, 404, 500)
   * @param message - Error message to return in the response
   */
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HTTPError'
    this.status = status
  }
}

