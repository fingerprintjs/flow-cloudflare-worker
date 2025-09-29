/**
 * Represents a standardised request object used by the patchers.
 *
 * This type provides a uniform interface for handling different types of fetch requests within the patchers.
 */
export type PatcherRequest = {
  /** The URL of the request as a string */
  url: string
  /** The HTTP method for the request (GET, POST, PUT, etc.) */
  method: string

  /**
   * Function to set a header on the request
   * @param name - The header name to set
   * @param value - The header value to set
   */
  setHeader: (name: string, value: string) => void
}
