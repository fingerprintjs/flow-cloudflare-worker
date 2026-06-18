import type { EdgeResponse } from '../fingerprint/identificationClientTypes'
import { identity, setOrRemoveHeaderField, sfBoolTrue, sfDate, sfString, sfStringFromNumber } from './headers'

// Serializer for `setOrRemoveHeaderField` used with boolean-valued fields. The header is only set
// when the value is truthy, so we always emit `?1` (RFC 9651 sf-boolean true).
const sfBoolTrueIfPresent = () => sfBoolTrue

export enum EdgeHeaders {
  IpV4Address = 'fp-ip-info-v4-address',
  IpV4GeolocationAccuracyRadius = 'fp-ip-info-v4-geolocation-accuracy-radius',
  IpV4GeolocationLatitude = 'fp-ip-info-v4-geolocation-latitude',
  IpV4GeolocationLongitude = 'fp-ip-info-v4-geolocation-longitude',
  IpV4GeolocationPostalCode = 'fp-ip-info-v4-geolocation-postal-code',
  IpV4GeolocationTimezone = 'fp-ip-info-v4-geolocation-timezone',
  IpV4GeolocationCityName = 'fp-ip-info-v4-geolocation-city-name',
  IpV4GeolocationCountryCode = 'fp-ip-info-v4-geolocation-country-code',
  IpV4GeolocationContinentCode = 'fp-ip-info-v4-geolocation-continent-code',
  IpV4AsnName = 'fp-ip-info-v4-asn-name',
  IpV4AsnNetwork = 'fp-ip-info-v4-asn-network',
  IpV4AsnType = 'fp-ip-info-v4-asn-type',
  IpV4DatacenterName = 'fp-ip-info-v4-datacenter-name',
  IpV6Address = 'fp-ip-info-v6-address',
  IpV6GeolocationAccuracyRadius = 'fp-ip-info-v6-geolocation-accuracy-radius',
  IpV6GeolocationLatitude = 'fp-ip-info-v6-geolocation-latitude',
  IpV6GeolocationLongitude = 'fp-ip-info-v6-geolocation-longitude',
  IpV6GeolocationPostalCode = 'fp-ip-info-v6-geolocation-postal-code',
  IpV6GeolocationTimezone = 'fp-ip-info-v6-geolocation-timezone',
  IpV6GeolocationCityName = 'fp-ip-info-v6-geolocation-city-name',
  IpV6GeolocationCountryCode = 'fp-ip-info-v6-geolocation-country-code',
  IpV6GeolocationContinentCode = 'fp-ip-info-v6-geolocation-continent-code',
  IpV6AsnName = 'fp-ip-info-v6-asn-name',
  IpV6AsnNetwork = 'fp-ip-info-v6-asn-network',
  IpV6AsnType = 'fp-ip-info-v6-asn-type',
  IpV6DatacenterName = 'fp-ip-info-v6-datacenter-name',
  BotInfoCategory = 'fp-bot-info-category',
  BotInfoProvider = 'fp-bot-info-provider',
  BotInfoName = 'fp-bot-info-name',
  BotInfoIdentity = 'fp-bot-info-identity',
  Proxy = 'fp-proxy',
  ProxyConfidence = 'fp-proxy-confidence',
  ProxyDetailsProxyType = 'fp-proxy-details-proxy-type',
  ProxyDetailsLastSeenAt = 'fp-proxy-details-last-seen-at',
  ProxyDetailsProvider = 'fp-proxy-details-provider',
  Vpn = 'fp-vpn',
  VpnConfidence = 'fp-vpn-confidence',
  VpnMethodsTimezoneMismatch = 'fp-vpn-methods-timezone-mismatch',
  VpnMethodsPublicVpn = 'fp-vpn-methods-public-vpn',
  VpnMethodsAuxiliaryMobile = 'fp-vpn-methods-auxiliary-mobile',
  VpnMethodsOsMismatch = 'fp-vpn-methods-os-mismatch',
  VpnMethodsRelay = 'fp-vpn-methods-relay',
  IpBlocklistTorNode = 'fp-ip-blocklist-tor-node',
}

const PROXY_HEADERS = [
  EdgeHeaders.Proxy,
  EdgeHeaders.ProxyConfidence,
  EdgeHeaders.ProxyDetailsProxyType,
  EdgeHeaders.ProxyDetailsLastSeenAt,
  EdgeHeaders.ProxyDetailsProvider,
] as const

const VPN_HEADERS = [
  EdgeHeaders.Vpn,
  EdgeHeaders.VpnConfidence,
  EdgeHeaders.VpnMethodsTimezoneMismatch,
  EdgeHeaders.VpnMethodsPublicVpn,
  EdgeHeaders.VpnMethodsAuxiliaryMobile,
  EdgeHeaders.VpnMethodsOsMismatch,
  EdgeHeaders.VpnMethodsRelay,
] as const

const IP_V4_INFO_HEADERS = [
  EdgeHeaders.IpV4Address,
  EdgeHeaders.IpV4GeolocationAccuracyRadius,
  EdgeHeaders.IpV4GeolocationLatitude,
  EdgeHeaders.IpV4GeolocationLongitude,
  EdgeHeaders.IpV4GeolocationPostalCode,
  EdgeHeaders.IpV4GeolocationTimezone,
  EdgeHeaders.IpV4GeolocationCityName,
  EdgeHeaders.IpV4GeolocationCountryCode,
  EdgeHeaders.IpV4GeolocationContinentCode,
  EdgeHeaders.IpV4AsnName,
  EdgeHeaders.IpV4AsnNetwork,
  EdgeHeaders.IpV4AsnType,
  EdgeHeaders.IpV4DatacenterName,
] as const

const IP_V6_INFO_HEADERS = [
  EdgeHeaders.IpV6Address,
  EdgeHeaders.IpV6GeolocationAccuracyRadius,
  EdgeHeaders.IpV6GeolocationLatitude,
  EdgeHeaders.IpV6GeolocationLongitude,
  EdgeHeaders.IpV6GeolocationPostalCode,
  EdgeHeaders.IpV6GeolocationTimezone,
  EdgeHeaders.IpV6GeolocationCityName,
  EdgeHeaders.IpV6GeolocationCountryCode,
  EdgeHeaders.IpV6GeolocationContinentCode,
  EdgeHeaders.IpV6AsnName,
  EdgeHeaders.IpV6AsnNetwork,
  EdgeHeaders.IpV6AsnType,
  EdgeHeaders.IpV6DatacenterName,
] as const

function setIpVersionHeaders(
  headers: Headers,
  info: NonNullable<EdgeResponse['ip_info']['v4'] | EdgeResponse['ip_info']['v6']> | undefined,
  names: typeof IP_V4_INFO_HEADERS | typeof IP_V6_INFO_HEADERS
) {
  const [
    addressHeader,
    accuracyRadiusHeader,
    latitudeHeader,
    longitudeHeader,
    postalCodeHeader,
    timezoneHeader,
    cityNameHeader,
    countryCodeHeader,
    continentCodeHeader,
    asnNameHeader,
    asnNetworkHeader,
    asnTypeHeader,
    datacenterNameHeader,
  ] = names

  setOrRemoveHeaderField(headers, addressHeader, identity, info?.address)
  const geo = info?.geolocation
  setOrRemoveHeaderField(headers, accuracyRadiusHeader, sfStringFromNumber, geo?.accuracy_radius)
  setOrRemoveHeaderField(headers, latitudeHeader, sfStringFromNumber, geo?.latitude)
  setOrRemoveHeaderField(headers, longitudeHeader, sfStringFromNumber, geo?.longitude)
  setOrRemoveHeaderField(headers, postalCodeHeader, sfString, geo?.postal_code)
  setOrRemoveHeaderField(headers, timezoneHeader, sfString, geo?.timezone)
  setOrRemoveHeaderField(headers, cityNameHeader, sfString, geo?.city_name)
  setOrRemoveHeaderField(headers, countryCodeHeader, sfString, geo?.country_code)
  setOrRemoveHeaderField(headers, continentCodeHeader, sfString, geo?.continent_code)
  setOrRemoveHeaderField(headers, asnNameHeader, sfString, info?.asn_name)
  setOrRemoveHeaderField(headers, asnNetworkHeader, sfString, info?.asn_network)
  setOrRemoveHeaderField(headers, asnTypeHeader, sfString, info?.asn_type)
  setOrRemoveHeaderField(headers, datacenterNameHeader, sfString, info?.datacenter_name)
}

function deleteHeaders(headers: Headers, names: readonly string[]) {
  for (const name of names) {
    headers.delete(name)
  }
}

/**
 * Set header fields that correspond to the properties from the `EdgeResponse` in the specified `requestHeaders`.
 *
 * Empty / null / `undefined` values are omitted. Structured-field values follow RFC 9651: strings are
 * escaped, booleans are `?1` (false values are omitted entirely), and dates use `@<unix-seconds>`.
 * Proxy and VPN groups are gated on their parent boolean: when `proxy`/`vpn` is not detected, none of
 * their sub-headers are sent.
 *
 * @param requestHeaders the `Headers` to update
 * @param edgeResponse the `EdgeResponse`
 */
export function setEdgeResponseHeaders(requestHeaders: Headers, edgeResponse?: EdgeResponse) {
  // Handle both v4 and v6 formats, the implementation will automatically set only the appropriate headers for correct IP version and remove the others
  setIpVersionHeaders(requestHeaders, edgeResponse?.ip_info.v4, IP_V4_INFO_HEADERS)
  setIpVersionHeaders(requestHeaders, edgeResponse?.ip_info.v6, IP_V6_INFO_HEADERS)

  setBotInfoHeaders(requestHeaders, edgeResponse?.bot_info)
  setProxyHeaders(requestHeaders, edgeResponse)
  setVpnHeaders(requestHeaders, edgeResponse)

  setOrRemoveHeaderField(
    requestHeaders,
    EdgeHeaders.IpBlocklistTorNode,
    sfBoolTrueIfPresent,
    edgeResponse?.ip_blocklist?.tor_node
  )
}

function setBotInfoHeaders(headers: Headers, botInfo: EdgeResponse['bot_info']) {
  setOrRemoveHeaderField(headers, EdgeHeaders.BotInfoCategory, identity, botInfo?.category)
  setOrRemoveHeaderField(headers, EdgeHeaders.BotInfoProvider, identity, botInfo?.provider)
  setOrRemoveHeaderField(headers, EdgeHeaders.BotInfoName, identity, botInfo?.name)
  setOrRemoveHeaderField(headers, EdgeHeaders.BotInfoIdentity, identity, botInfo?.identity)
}

function setProxyHeaders(headers: Headers, edgeResponse: EdgeResponse | undefined) {
  if (!edgeResponse?.proxy) {
    deleteHeaders(headers, PROXY_HEADERS)
    return
  }

  headers.set(EdgeHeaders.Proxy, sfBoolTrue)
  setOrRemoveHeaderField(headers, EdgeHeaders.ProxyConfidence, sfString, edgeResponse.proxy_confidence)
  setOrRemoveHeaderField(headers, EdgeHeaders.ProxyDetailsProxyType, sfString, edgeResponse.proxy_details?.proxy_type)
  setOrRemoveHeaderField(headers, EdgeHeaders.ProxyDetailsLastSeenAt, sfDate, edgeResponse.proxy_details?.last_seen_at)
  setOrRemoveHeaderField(headers, EdgeHeaders.ProxyDetailsProvider, sfString, edgeResponse.proxy_details?.provider)
}

function setVpnHeaders(headers: Headers, edgeResponse: EdgeResponse | undefined) {
  if (!edgeResponse?.vpn) {
    deleteHeaders(headers, VPN_HEADERS)
    return
  }

  headers.set(EdgeHeaders.Vpn, sfBoolTrue)
  setOrRemoveHeaderField(headers, EdgeHeaders.VpnConfidence, sfString, edgeResponse.vpn_confidence)
  const methods = edgeResponse.vpn_methods
  setOrRemoveHeaderField(
    headers,
    EdgeHeaders.VpnMethodsTimezoneMismatch,
    sfBoolTrueIfPresent,
    methods?.timezone_mismatch
  )
  setOrRemoveHeaderField(headers, EdgeHeaders.VpnMethodsPublicVpn, sfBoolTrueIfPresent, methods?.public_vpn)
  setOrRemoveHeaderField(headers, EdgeHeaders.VpnMethodsAuxiliaryMobile, sfBoolTrueIfPresent, methods?.auxiliary_mobile)
  setOrRemoveHeaderField(headers, EdgeHeaders.VpnMethodsOsMismatch, sfBoolTrueIfPresent, methods?.os_mismatch)
  setOrRemoveHeaderField(headers, EdgeHeaders.VpnMethodsRelay, sfBoolTrueIfPresent, methods?.relay)
}
