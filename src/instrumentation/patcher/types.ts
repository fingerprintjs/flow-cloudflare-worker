export type PatcherRequest = {
  url: string
  method: string

  setHeader: (name: string, value: string) => void
}
