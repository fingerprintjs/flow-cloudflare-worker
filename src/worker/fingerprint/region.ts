export type Region = 'eu' | 'ap' | 'us'

const regions: Region[] = ['eu', 'ap', 'us']

export function isRegion(value: string): value is Region {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return (regions as string[]).includes(value)
}
