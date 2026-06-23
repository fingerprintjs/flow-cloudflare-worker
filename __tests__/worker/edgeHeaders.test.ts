import { describe, expect, it } from 'vitest'
import { EdgeHeaders, setEdgeResponseHeaders } from '../../src/worker/utils/edgeHeaders'
import { EdgeResponse } from '../../src/worker/fingerprint/identificationClientTypes'

describe('Edge headers', () => {
  describe('setEdgeResponseHeaders', () => {
    const ipV4Info = {
      address: '1.2.3.4',
      geolocation: {
        accuracy_radius: 5000,
        latitude: 52.2297,
        longitude: 21.0122,
        postal_code: '00-001',
        timezone: 'Europe/Warsaw',
        city_name: 'Warsaw',
        country_code: 'PL',
        continent_code: 'EU',
      },
      asn_name: 'Example ISP',
      asn_network: '1.2.0.0/16',
      asn_type: 'isp',
      datacenter_name: 'AWS',
    } as const

    const ipV6Info = {
      address: '2001:db8::1',
      geolocation: {
        accuracy_radius: 5000,
        latitude: 52.2297,
        longitude: 21.0122,
        postal_code: '00-001',
        timezone: 'Europe/Warsaw',
        city_name: 'Warsaw',
        country_code: 'PL',
        continent_code: 'EU',
      },
      asn_name: 'Example ISP',
      asn_network: '2001:db8::/32',
      asn_type: 'isp',
      datacenter_name: 'AWS',
    } as const

    const fullEdgeResponse = {
      ip_info: {
        v4: ipV4Info,
        v6: ipV6Info,
      },
      bot_info: {
        category: 'search_engine',
        provider: 'google',
        name: 'test-bot',
        identity: 'verified' as const,
        confidence: 'high' as const,
      },
      proxy: true,
      proxy_confidence: 'medium' as const,
      proxy_details: {
        proxy_type: 'residential',
        last_seen_at: 1733928833000,
        provider: 'Example Proxy',
      },
      vpn: true,
      vpn_confidence: 'high' as const,
      vpn_methods: {
        timezone_mismatch: true,
        public_vpn: true,
        auxiliary_mobile: true,
        os_mismatch: true,
        relay: true,
      },
      ip_blocklist: { tor_node: true },
    } satisfies EdgeResponse

    // Header / value pairs that the full EdgeResponse above is expected to produce.
    const expectedFullHeaders: [EdgeHeaders, string][] = [
      [EdgeHeaders.IpV4Address, '"1.2.3.4"'],
      [EdgeHeaders.IpV4GeolocationAccuracyRadius, '"5000"'],
      [EdgeHeaders.IpV4GeolocationLatitude, '"52.2297"'],
      [EdgeHeaders.IpV4GeolocationLongitude, '"21.0122"'],
      [EdgeHeaders.IpV4GeolocationPostalCode, '"00-001"'],
      [EdgeHeaders.IpV4GeolocationTimezone, '"Europe/Warsaw"'],
      [EdgeHeaders.IpV4GeolocationCityName, '%"Warsaw"'],
      [EdgeHeaders.IpV4GeolocationCountryCode, '"PL"'],
      [EdgeHeaders.IpV4GeolocationContinentCode, '"EU"'],
      [EdgeHeaders.IpV4AsnName, '%"Example ISP"'],
      [EdgeHeaders.IpV4AsnNetwork, '"1.2.0.0/16"'],
      [EdgeHeaders.IpV4AsnType, '"isp"'],
      [EdgeHeaders.IpV4DatacenterName, '%"AWS"'],
      [EdgeHeaders.IpV6Address, '"2001:db8::1"'],
      [EdgeHeaders.IpV6GeolocationAccuracyRadius, '"5000"'],
      [EdgeHeaders.IpV6GeolocationLatitude, '"52.2297"'],
      [EdgeHeaders.IpV6GeolocationLongitude, '"21.0122"'],
      [EdgeHeaders.IpV6GeolocationPostalCode, '"00-001"'],
      [EdgeHeaders.IpV6GeolocationTimezone, '"Europe/Warsaw"'],
      [EdgeHeaders.IpV6GeolocationCityName, '%"Warsaw"'],
      [EdgeHeaders.IpV6GeolocationCountryCode, '"PL"'],
      [EdgeHeaders.IpV6GeolocationContinentCode, '"EU"'],
      [EdgeHeaders.IpV6AsnName, '%"Example ISP"'],
      [EdgeHeaders.IpV6AsnNetwork, '"2001:db8::/32"'],
      [EdgeHeaders.IpV6AsnType, '"isp"'],
      [EdgeHeaders.IpV6DatacenterName, '%"AWS"'],
      [EdgeHeaders.BotInfoCategory, '"search_engine"'],
      [EdgeHeaders.BotInfoProvider, '%"google"'],
      [EdgeHeaders.BotInfoName, '%"test-bot"'],
      [EdgeHeaders.BotInfoIdentity, '"verified"'],
      [EdgeHeaders.Proxy, '?1'],
      [EdgeHeaders.ProxyConfidence, '"medium"'],
      [EdgeHeaders.ProxyDetailsProxyType, '"residential"'],
      [EdgeHeaders.ProxyDetailsLastSeenAt, '@1733928833'],
      [EdgeHeaders.ProxyDetailsProvider, '%"Example Proxy"'],
      [EdgeHeaders.Vpn, '?1'],
      [EdgeHeaders.VpnConfidence, '"high"'],
      [EdgeHeaders.VpnMethodsTimezoneMismatch, '?1'],
      [EdgeHeaders.VpnMethodsPublicVpn, '?1'],
      [EdgeHeaders.VpnMethodsAuxiliaryMobile, '?1'],
      [EdgeHeaders.VpnMethodsOsMismatch, '?1'],
      [EdgeHeaders.VpnMethodsRelay, '?1'],
      [EdgeHeaders.IpBlocklistTorNode, '?1'],
    ]

    function expectHeadersToMatch(headers: Headers, expected: [EdgeHeaders, string][]) {
      for (const [name, value] of expected) {
        expect(headers.get(name)).toEqual(value)
      }
    }

    function expectHeadersToBeAbsent(headers: Headers, names: EdgeHeaders[]) {
      for (const name of names) {
        expect(headers.has(name)).toEqual(false)
      }
    }

    it('sets all edge response headers when a full EdgeResponse is provided', () => {
      const headers = new Headers()
      setEdgeResponseHeaders(headers, fullEdgeResponse)
      expectHeadersToMatch(headers, expectedFullHeaders)
    })

    it('removes all edge response headers when edgeResponse is undefined', () => {
      const headers = new Headers(Object.fromEntries(expectedFullHeaders))
      setEdgeResponseHeaders(headers, undefined)
      expectHeadersToBeAbsent(
        headers,
        expectedFullHeaders.map(([name]) => name)
      )
    })

    it('removes the IPv4 header when ip_info.v4 is absent', () => {
      const headers = new Headers({ [EdgeHeaders.IpV4Address]: '"1.2.3.4"' })
      setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_info: { v6: fullEdgeResponse.ip_info.v6 } })
      expect(headers.has(EdgeHeaders.IpV4Address)).toEqual(false)
      expect(headers.get(EdgeHeaders.IpV6Address)).toEqual('"2001:db8::1"')
    })

    it('removes the IPv6 header when ip_info.v6 is absent', () => {
      const headers = new Headers({ [EdgeHeaders.IpV6Address]: '"2001:db8::1"' })
      setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_info: { v4: fullEdgeResponse.ip_info.v4 } })
      expect(headers.get(EdgeHeaders.IpV4Address)).toEqual('"1.2.3.4"')
      expect(headers.has(EdgeHeaders.IpV6Address)).toEqual(false)
    })

    it('removes all bot headers when bot_info is absent', () => {
      const headers = new Headers({
        [EdgeHeaders.BotInfoCategory]: 'search_engine',
        [EdgeHeaders.BotInfoProvider]: 'google',
        [EdgeHeaders.BotInfoName]: 'test-bot',
        [EdgeHeaders.BotInfoIdentity]: 'verified',
      })
      setEdgeResponseHeaders(headers, { ip_info: fullEdgeResponse.ip_info })
      expectHeadersToBeAbsent(headers, [
        EdgeHeaders.BotInfoCategory,
        EdgeHeaders.BotInfoProvider,
        EdgeHeaders.BotInfoName,
        EdgeHeaders.BotInfoIdentity,
      ])
    })

    it('mutates the passed-in headers object', () => {
      const headers = new Headers()
      setEdgeResponseHeaders(headers, fullEdgeResponse)
      expect(headers.get(EdgeHeaders.IpV4Address)).toEqual(`"${fullEdgeResponse.ip_info.v4.address}"`)
    })

    describe('ip', () => {
      it('omits geolocation, asn, and datacenter headers when the fields are missing', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ...fullEdgeResponse,
          ip_info: { v4: { address: ipV4Info.address } },
        })
        expect(headers.get(EdgeHeaders.IpV4Address)).toEqual('"1.2.3.4"')
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.IpV4GeolocationLatitude,
          EdgeHeaders.IpV4AsnName,
          EdgeHeaders.IpV4DatacenterName,
        ])
      })

      it('omits the datacenter header when datacenter is not detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ...fullEdgeResponse,
          ip_info: { v4: { ...ipV4Info, datacenter_name: undefined } },
        })
        expect(headers.has(EdgeHeaders.IpV4DatacenterName)).toEqual(false)
      })

      it('clears stale v4 ip_info headers when v4 is absent', () => {
        const headers = new Headers({
          [EdgeHeaders.IpV4Address]: '"1.2.3.4"',
          [EdgeHeaders.IpV4GeolocationCityName]: '%"Warsaw"',
          [EdgeHeaders.IpV4DatacenterName]: '%"AWS"',
        })
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_info: { v6: ipV6Info } })
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.IpV4Address,
          EdgeHeaders.IpV4GeolocationCityName,
          EdgeHeaders.IpV4DatacenterName,
        ])
        expect(headers.get(EdgeHeaders.IpV6Address)).toEqual('"2001:db8::1"')
      })
    })

    describe('proxy', () => {
      it('skips proxy sub-headers that have no value, even when proxy is detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, proxy_confidence: undefined, proxy_details: undefined })
        expect(headers.get(EdgeHeaders.Proxy)).toEqual('?1')
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.ProxyConfidence,
          EdgeHeaders.ProxyDetailsProxyType,
          EdgeHeaders.ProxyDetailsLastSeenAt,
          EdgeHeaders.ProxyDetailsProvider,
        ])
      })

      it('does not emit any proxy headers when proxy is not detected', () => {
        const headers = new Headers()
        // proxy is false but the sub-fields are populated; none should be emitted
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, proxy: false })
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.Proxy,
          EdgeHeaders.ProxyConfidence,
          EdgeHeaders.ProxyDetailsProxyType,
          EdgeHeaders.ProxyDetailsProvider,
        ])
      })

      it('clears stale proxy headers when proxy becomes undetected', () => {
        const headers = new Headers({
          [EdgeHeaders.Proxy]: '?1',
          [EdgeHeaders.ProxyConfidence]: '"medium"',
          [EdgeHeaders.ProxyDetailsProvider]: '%"Example"',
        })
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, proxy: false })
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.Proxy,
          EdgeHeaders.ProxyConfidence,
          EdgeHeaders.ProxyDetailsProvider,
        ])
      })
    })

    describe('vpn', () => {
      it('emits only the true vpn method headers when vpn is detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ...fullEdgeResponse,
          vpn_methods: {
            timezone_mismatch: true,
            public_vpn: false,
            auxiliary_mobile: false,
            os_mismatch: false,
            relay: true,
          },
        })
        expectHeadersToMatch(headers, [
          [EdgeHeaders.Vpn, '?1'],
          [EdgeHeaders.VpnConfidence, '"high"'],
          [EdgeHeaders.VpnMethodsTimezoneMismatch, '?1'],
          [EdgeHeaders.VpnMethodsRelay, '?1'],
        ])
        expectHeadersToBeAbsent(headers, [
          EdgeHeaders.VpnMethodsPublicVpn,
          EdgeHeaders.VpnMethodsAuxiliaryMobile,
          EdgeHeaders.VpnMethodsOsMismatch,
        ])
      })

      it('does not emit any vpn headers when vpn is not detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, vpn: false })
        expectHeadersToBeAbsent(headers, [EdgeHeaders.Vpn, EdgeHeaders.VpnConfidence, EdgeHeaders.VpnMethodsRelay])
      })

      it('clears stale vpn headers when vpn becomes undetected', () => {
        const headers = new Headers({
          [EdgeHeaders.Vpn]: '?1',
          [EdgeHeaders.VpnConfidence]: '"high"',
          [EdgeHeaders.VpnMethodsRelay]: '?1',
        })
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, vpn: false })
        expectHeadersToBeAbsent(headers, [EdgeHeaders.Vpn, EdgeHeaders.VpnConfidence, EdgeHeaders.VpnMethodsRelay])
      })
    })

    describe('ip_blocklist', () => {
      it('omits tor_node header when false', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_blocklist: { tor_node: false } })
        expect(headers.has(EdgeHeaders.IpBlocklistTorNode)).toEqual(false)
      })

      it('omits tor_node header when blocklist is absent', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_blocklist: undefined })
        expect(headers.has(EdgeHeaders.IpBlocklistTorNode)).toEqual(false)
      })

      it('clears stale tor_node header when blocklist is absent', () => {
        const headers = new Headers({ [EdgeHeaders.IpBlocklistTorNode]: '?1' })
        setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_blocklist: undefined })
        expect(headers.has(EdgeHeaders.IpBlocklistTorNode)).toEqual(false)
      })
    })
  })
})
