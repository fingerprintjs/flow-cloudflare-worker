import { Response } from '@playwright/test'

export const getReceivedHeaders = (response: Response) => {
  const rawData: string = response.headers()['x-received-headers']
  const parsedData: Array<{ name: string; value: string }> = JSON.parse(rawData)

  return new Headers(parsedData.map(({ name, value }) => [name, value]))
}
