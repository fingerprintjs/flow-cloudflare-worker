import { getEnv } from './env'
import { z } from 'zod'
import { EdgeHeadersDict, isEdgeHeader } from './edge'

export enum MalformedModes {
  MissingSignatureAgent = 'missing-signature-agent',
  MissingAuthority = 'missing-authority',
  ExpiredSignature = 'expired-signature',
  NotValidExpires = 'invalid-expires',
  NotValidCreated = 'invalid-created',
}

export type NoScriptRequest = {
  url: string
  spoofOriginUrl?: string
  malformedModes?: MalformedModes[]
}

async function getContents(entry: Blob | string | null) {
  if (entry) {
    if (typeof entry === 'string') {
      return entry
    } else {
      if (entry.type.startsWith('application/json')) {
        return JSON.parse(await entry.text())
      } else if (entry.type.startsWith('text/')) {
        return await entry.text()
      } else {
        return await entry.bytes()
      }
    }
  }

  return undefined
}

const Header = z.object({
  name: z.string(),
  value: z.string(),
})

const NoScriptMetadata = z.object({
  response: z.object({
    headers: z.array(Header),
  }),
})

type Header = z.infer<typeof Header>

async function sendNoScript(body: NoScriptRequest) {
  const url = new URL(getEnv('AI_AGENT_API_URL'))
  url.pathname = '/api/no-script'

  const request = new Request(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': getEnv('AI_AGENT_TOKEN'),
    },
    body: JSON.stringify(body),
  })

  const response = await fetch(request)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}. ${text}`)
  }
  const formData = await response.formData()

  const metadata = await getContents(formData.get('metadata'))

  if (typeof metadata !== 'object' || !metadata) {
    throw new Error('Metadata is not a valid object')
  }

  const parsedMetadata = NoScriptMetadata.parse(metadata)

  const receivedHeaders = parsedMetadata.response.headers?.find((header) => header.name === 'x-received-headers')
  if (!receivedHeaders) {
    throw new Error('Missing x-received-headers header')
  }

  const receivedHeadersJson = Header.array().parse(JSON.parse(receivedHeaders.value))

  return receivedHeadersJson.reduce<EdgeHeadersDict>((acc, header) => {
    if (isEdgeHeader(header.name)) {
      acc[header.name] = header.value
    }

    return acc
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  }, {} as EdgeHeadersDict)
}

export const AiAgentAPI = {
  noScript: sendNoScript,
}
