/**
 * Fetches and returns a script with FingerprintJS Pro agent loader for the specified public API key.
 *
 * @param {string} publicApiKey - The public API key used to generate the script URL.
 * @param {string} cdnHost - Hostname of the Fingerprint CDN.
 * @return {Promise<Response>} A promise that resolves to a Response object containing the fetched script with the 'Content-Type' header set to 'application/javascript'.
 */
export async function getAgentLoader(publicApiKey: string, cdnHost: string): Promise<Response> {
  const fpScriptUrl = `https://${cdnHost}/v4/${publicApiKey}`

  console.debug('Fetching agent loader from:', fpScriptUrl)

  const agentLoaderCode = await fetch(fpScriptUrl).then((response) => response.text())

  console.debug('Agent loader code:', agentLoaderCode)

  return new Response(agentLoaderCode, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  })
}
