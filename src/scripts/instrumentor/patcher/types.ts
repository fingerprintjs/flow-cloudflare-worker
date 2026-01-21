/**
 * Represents a standardised request object used by the patchers.
 *
 * This type provides a uniform interface for handling different types of requests within the patchers.
 */
export interface PatcherRequest {
  /** The URL of the request as a string */
  url: string
  /** The HTTP method for the request (GET, POST, PUT, etc.) */
  method: string

  /**
   * Configure the request to include credentials in cross-origin requests.
   *
   * @returns true if the application had previously set credentials to be included in cross-origin requests.
   */
  setIncludeCredentials(): boolean

  /**
   * Function to set a header on the request
   * @param name - The header name to set
   * @param value - The header value to set
   */
  setHeader(name: string, value: string): void
}
