import { z } from 'zod/v4'

export const Region = z.union([z.literal('eu'), z.literal('ap'), z.literal('us')])

export type Region = z.infer<typeof Region>

export function isRegion(value: string): value is Region {
  return Region.safeParse(value).success
}
