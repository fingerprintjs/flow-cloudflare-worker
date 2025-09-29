/**
 * Fetches and returns an IIFE (Immediately Invoked Function Expression) script with FingerprintJS Pro agent loader for the specified public API key.
 *
 * @param {string} publicApiKey - The public API key used to generate the script URL.
 * @param {string} cdnHost - Hostname of the Fingerprint CDN.
 * @return {Promise<Response>} A promise that resolves to a Response object containing the fetched IIFE script with the 'Content-Type' header set to 'application/javascript'.
 */
export async function getAgentLoader(publicApiKey: string, cdnHost: string): Promise<Response> {
  const fpScriptUrl = `https://${cdnHost}/v3/${publicApiKey}/iife.min.js`

  const agentLoaderCode = await fetch(fpScriptUrl).then((response) => response.text())

  return new Response(agentLoaderCode, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  })
}
