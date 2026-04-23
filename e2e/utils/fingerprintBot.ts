import crypto from 'node:crypto'

const USER_AGENT = `Fingerprint-AI-Agent/0.0.0`
const SIGNATURE_AGENT_URI = 'https://fingerprint.com'
const SIGNATURE_AGENT_HEADER = `"${SIGNATURE_AGENT_URI}"`
const JWKS_URL = 'https://fingerprint.com/.well-known/http-message-signatures-directory'

let cachedKeyId = ''
async function fetchKeyId(): Promise<string> {
  if (!cachedKeyId) {
    const response = await fetch(JWKS_URL)
    if (!response.ok) {
      throw new Error(`JWKS request failed with status ${response.status}`)
    }
    const jwks = await response.json()
    cachedKeyId = jwks?.keys?.[0]?.kid
    if (!cachedKeyId) {
      throw new Error('JWKS missing keys[0].kid')
    }
  }

  return cachedKeyId
}

export async function getFingerprintBotHeaders(url: URL, privateKey = getPrivateKey()) {
  const keyId = await fetchKeyId()

  const created = Math.floor(Date.now() / 1000)
  // expires = now + 60 seconds
  const expires = created + 60

  // Component values
  const authorityValue = url.host

  const nonce = crypto.randomBytes(16).toString('base64')

  // Signature Input string (what gets signed)
  // Format per RFC 9421 Section 2.1:
  //   "<component-name>": <value>\n  (one per component)
  //   "@signature-params": <sig-params>
  const sigParams =
    `("@authority" "signature-agent")` +
    `;created=${created}` +
    `;expires=${expires}` +
    `;keyid="${keyId}"` +
    `;alg="ed25519"` +
    `;nonce="${nonce}"` +
    `;tag="web-bot-auth"`

  // Signature base string per RFC 9421 Section 2.5
  // Each component line: "<name>": <value>
  // Header values are quoted strings; @authority is a plain token (hostname)
  const signingInput = [
    `"@authority": ${authorityValue}`,
    `"signature-agent": "${SIGNATURE_AGENT_URI}"`,
    `"@signature-params": ${sigParams}`,
  ].join('\n')

  // Sign with Ed25519 private key
  const signature = crypto.sign(null, Buffer.from(signingInput), privateKey)

  return {
    'signature-agent': SIGNATURE_AGENT_HEADER,
    'signature-input': `sig1=${sigParams}`,
    signature: `sig1=:${signature.toString('base64')}:`,
    'user-agent': USER_AGENT,
  }
}

function getPrivateKey(): string {
  const privateKey = process.env.AI_AGENT_PRIVATE_KEY ?? ''
  if (!privateKey) {
    console.warn('AI_AGENT_PRIVATE_KEY is not set')
  }
  return privateKey
}
