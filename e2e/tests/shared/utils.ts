import { expect, Response } from '@playwright/test'

export const getReceivedHeaders = (response: Response) => {
  const rawData: string = response.headers()['x-received-headers']
  const parsedData: Array<{ name: string; value: string }> = JSON.parse(rawData)

  return new Headers(parsedData.map(({ name, value }) => [name, value]))
}

export function assertIsDefined<T>(value: T, name?: string): asserts value is Exclude<T, null | undefined> {
  expect(value).toBeDefined()
  if (value === null || value === undefined) {
    throw new Error(`${name ?? 'value'} must not be null or undefined`)
  }
}
