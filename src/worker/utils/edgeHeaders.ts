import { EdgeResponse } from '../fingerprint/identificationClientTypes'
import { setOrRemoveHeaderField, sfBoolTrue, sfDate, sfString } from './headers'

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

  setOrRemoveHeaderField(headers, addressHeader, info?.address)
  const geo = info?.geolocation
  setOrRemoveHeaderField(
    headers,
    accuracyRadiusHeader,
    geo?.accuracy_radius != null ? sfString(String(geo.accuracy_radius)) : undefined
  )
  setOrRemoveHeaderField(headers, latitudeHeader, geo?.latitude != null ? sfString(String(geo.latitude)) : undefined)
  setOrRemoveHeaderField(headers, longitudeHeader, geo?.longitude != null ? sfString(String(geo.longitude)) : undefined)
  setOrRemoveHeaderField(headers, postalCodeHeader, geo?.postal_code ? sfString(geo.postal_code) : undefined)
  setOrRemoveHeaderField(headers, timezoneHeader, geo?.timezone ? sfString(geo.timezone) : undefined)
  setOrRemoveHeaderField(headers, cityNameHeader, geo?.city_name ? sfString(geo.city_name) : undefined)
  setOrRemoveHeaderField(headers, countryCodeHeader, geo?.country_code ? sfString(geo.country_code) : undefined)
  setOrRemoveHeaderField(headers, continentCodeHeader, geo?.continent_code ? sfString(geo.continent_code) : undefined)
  setOrRemoveHeaderField(headers, asnNameHeader, info?.asn_name ? sfString(info.asn_name) : undefined)
  setOrRemoveHeaderField(headers, asnNetworkHeader, info?.asn_network ? sfString(info.asn_network) : undefined)
  setOrRemoveHeaderField(headers, asnTypeHeader, info?.asn_type ? sfString(info.asn_type) : undefined)
  setOrRemoveHeaderField(
    headers,
    datacenterNameHeader,
    info?.datacenter_name ? sfString(info.datacenter_name) : undefined
  )
}

function deleteHeaders(headers: Headers, names: readonly string[]) {
  for (const name of names) {
    headers.delete(name)
  }
}

/**
 * Set header fields that correspond to the properties from the `EdgeResponse` in the specified `requestHeaders`.
 *
 * Empty / null / `undefined` values are omitted. Structured-field values follow RFC 8941: strings are
 * escaped, booleans are `?1` (false values are omitted entirely), and dates use `@<unix-seconds>`.
 * Proxy and VPN groups are gated on their parent boolean: when `proxy`/`vpn` is not detected, none of
 * their sub-headers are sent.
 *
 * @param requestHeaders the `Headers` to update
 * @param edgeResponse the `EdgeResponse`
 */
export function setEdgeResponseHeaders(requestHeaders: Headers, edgeResponse?: EdgeResponse) {
  setIpVersionHeaders(requestHeaders, edgeResponse?.ip_info.v4, IP_V4_INFO_HEADERS)
  setIpVersionHeaders(requestHeaders, edgeResponse?.ip_info.v6, IP_V6_INFO_HEADERS)

  setOrRemoveHeaderField(requestHeaders, EdgeHeaders.BotInfoCategory, edgeResponse?.bot_info?.category)
  setOrRemoveHeaderField(requestHeaders, EdgeHeaders.BotInfoProvider, edgeResponse?.bot_info?.provider)
  setOrRemoveHeaderField(requestHeaders, EdgeHeaders.BotInfoName, edgeResponse?.bot_info?.name)
  setOrRemoveHeaderField(requestHeaders, EdgeHeaders.BotInfoIdentity, edgeResponse?.bot_info?.identity)

  if (edgeResponse?.proxy) {
    requestHeaders.set(EdgeHeaders.Proxy, sfBoolTrue)
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.ProxyConfidence,
      edgeResponse.proxy_confidence ? sfString(edgeResponse.proxy_confidence) : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.ProxyDetailsProxyType,
      edgeResponse.proxy_details?.proxy_type ? sfString(edgeResponse.proxy_details.proxy_type) : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.ProxyDetailsLastSeenAt,
      edgeResponse.proxy_details?.last_seen_at ? sfDate(edgeResponse.proxy_details.last_seen_at) : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.ProxyDetailsProvider,
      edgeResponse.proxy_details?.provider ? sfString(edgeResponse.proxy_details.provider) : undefined
    )
  } else {
    deleteHeaders(requestHeaders, PROXY_HEADERS)
  }

  if (edgeResponse?.vpn) {
    requestHeaders.set(EdgeHeaders.Vpn, sfBoolTrue)
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.VpnConfidence,
      edgeResponse.vpn_confidence ? sfString(edgeResponse.vpn_confidence) : undefined
    )
    const methods = edgeResponse.vpn_methods
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.VpnMethodsTimezoneMismatch,
      methods?.timezone_mismatch ? sfBoolTrue : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.VpnMethodsPublicVpn,
      methods?.public_vpn ? sfBoolTrue : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.VpnMethodsAuxiliaryMobile,
      methods?.auxiliary_mobile ? sfBoolTrue : undefined
    )
    setOrRemoveHeaderField(
      requestHeaders,
      EdgeHeaders.VpnMethodsOsMismatch,
      methods?.os_mismatch ? sfBoolTrue : undefined
    )
    setOrRemoveHeaderField(requestHeaders, EdgeHeaders.VpnMethodsRelay, methods?.relay ? sfBoolTrue : undefined)
  } else {
    deleteHeaders(requestHeaders, VPN_HEADERS)
  }

  setOrRemoveHeaderField(
    requestHeaders,
    EdgeHeaders.IpBlocklistTorNode,
    edgeResponse?.ip_blocklist?.tor_node ? sfBoolTrue : undefined
  )
}
