export type IpType = 'ipv4' | 'ipv6'

export function getIpType(ip: string): IpType {
  // IPv6 addresses contain multiple colons, or start with [
  if (ip.includes('::') || (ip.match(/:/g)?.length ?? 0) >= 2 || ip.startsWith('[')) {
    return 'ipv6'
  }
  return 'ipv4'
}
