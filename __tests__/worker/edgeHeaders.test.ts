import { describe, expect, it } from 'vitest'
import { EdgeHeaders, setEdgeResponseHeaders } from '../../src/worker/utils/edgeHeaders'
import { EdgeResponse } from '../../src/worker/fingerprint/identificationClientTypes'

describe('Edge headers', () => {
  describe('setEdgeResponseHeaders', () => {
    const fullEdgeResponse = {
      ip_info: {
        v4: { address: '1.2.3.4' },
        v6: { address: '2001:db8::1' },
      },
      bot_info: {
        category: 'search_engine',
        provider: 'google',
        name: 'test-bot',
        identity: 'verified' as const,
        confidence: 'high' as const,
      },
    } satisfies EdgeResponse

    it('sets all edge response headers when a full EdgeResponse is provided', () => {
      const headers = new Headers()
      setEdgeResponseHeaders(headers, fullEdgeResponse)
      expect(headers.get(EdgeHeaders.IpV4Address)).toEqual(fullEdgeResponse.ip_info.v4.address)
      expect(headers.get(EdgeHeaders.IpV6Address)).toEqual(fullEdgeResponse.ip_info.v6.address)
      expect(headers.get(EdgeHeaders.BotInfoCategory)).toEqual(fullEdgeResponse.bot_info.category)
      expect(headers.get(EdgeHeaders.BotInfoProvider)).toEqual(fullEdgeResponse.bot_info.provider)
      expect(headers.get(EdgeHeaders.BotInfoName)).toEqual(fullEdgeResponse.bot_info.name)
      expect(headers.get(EdgeHeaders.BotInfoIdentity)).toEqual(fullEdgeResponse.bot_info.identity)
    })

    it('removes all edge response headers when edgeResponse is undefined', () => {
      const headers = new Headers({
        [EdgeHeaders.IpV4Address]: fullEdgeResponse.ip_info.v4.address,
        [EdgeHeaders.IpV6Address]: fullEdgeResponse.ip_info.v6.address,
        [EdgeHeaders.BotInfoCategory]: fullEdgeResponse.bot_info.category,
        [EdgeHeaders.BotInfoProvider]: fullEdgeResponse.bot_info.provider,
        [EdgeHeaders.BotInfoName]: fullEdgeResponse.bot_info.name,
        [EdgeHeaders.BotInfoIdentity]: fullEdgeResponse.bot_info.identity,
      })
      setEdgeResponseHeaders(headers, undefined)
      expect(headers.has(EdgeHeaders.IpV4Address)).toEqual(false)
      expect(headers.has(EdgeHeaders.IpV6Address)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoCategory)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoProvider)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoName)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoIdentity)).toEqual(false)
    })

    it('removes the IPv4 header when ip_info.v4 is absent', () => {
      const headers = new Headers({ [EdgeHeaders.IpV4Address]: '1.2.3.4' })
      setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_info: { v6: fullEdgeResponse.ip_info.v6 } })
      expect(headers.has(EdgeHeaders.IpV4Address)).toEqual(false)
      expect(headers.get(EdgeHeaders.IpV6Address)).toEqual('2001:db8::1')
    })

    it('removes the IPv6 header when ip_info.v6 is absent', () => {
      const headers = new Headers({ [EdgeHeaders.IpV6Address]: '2001:db8::1' })
      setEdgeResponseHeaders(headers, { ...fullEdgeResponse, ip_info: { v4: fullEdgeResponse.ip_info.v4 } })
      expect(headers.get(EdgeHeaders.IpV4Address)).toEqual('1.2.3.4')
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
      expect(headers.has(EdgeHeaders.BotInfoCategory)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoProvider)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoName)).toEqual(false)
      expect(headers.has(EdgeHeaders.BotInfoIdentity)).toEqual(false)
    })

    it('mutates the passed-in headers object', () => {
      const headers = new Headers()
      setEdgeResponseHeaders(headers, fullEdgeResponse)
      expect(headers.get(EdgeHeaders.IpV4Address)).toEqual(fullEdgeResponse.ip_info.v4.address)
    })

    describe('ip', () => {
      const fullV4: EdgeResponse = {
        ip_info: {
          v4: {
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
          },
        },
      }

      it('emits all v4 ip_info headers, with structured-field strings wrapped in quotes', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, fullV4)
        expect(headers.get(EdgeHeaders.IpV4Address)).toEqual('1.2.3.4')
        expect(headers.get(EdgeHeaders.IpV4GeolocationAccuracyRadius)).toEqual('"5000"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationLatitude)).toEqual('"52.2297"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationLongitude)).toEqual('"21.0122"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationPostalCode)).toEqual('"00-001"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationTimezone)).toEqual('"Europe/Warsaw"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationCityName)).toEqual('"Warsaw"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationCountryCode)).toEqual('"PL"')
        expect(headers.get(EdgeHeaders.IpV4GeolocationContinentCode)).toEqual('"EU"')
        expect(headers.get(EdgeHeaders.IpV4AsnName)).toEqual('"Example ISP"')
        expect(headers.get(EdgeHeaders.IpV4AsnNetwork)).toEqual('"1.2.0.0/16"')
        expect(headers.get(EdgeHeaders.IpV4AsnType)).toEqual('"isp"')
        expect(headers.get(EdgeHeaders.IpV4DatacenterName)).toEqual('"AWS"')
      })

      it('omits geolocation, asn, and datacenter headers when the fields are missing', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, { ip_info: { v4: { address: '1.2.3.4' } } })
        expect(headers.get(EdgeHeaders.IpV4Address)).toEqual('1.2.3.4')
        expect(headers.has(EdgeHeaders.IpV4GeolocationLatitude)).toEqual(false)
        expect(headers.has(EdgeHeaders.IpV4AsnName)).toEqual(false)
        expect(headers.has(EdgeHeaders.IpV4DatacenterName)).toEqual(false)
      })

      it('omits the datacenter header when datacenter is not detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4', asn_name: 'Example ISP' } },
        })
        expect(headers.has(EdgeHeaders.IpV4DatacenterName)).toEqual(false)
      })

      it('clears stale v4 ip_info headers when v4 is absent', () => {
        const headers = new Headers({
          [EdgeHeaders.IpV4Address]: '1.2.3.4',
          [EdgeHeaders.IpV4GeolocationCityName]: '"Warsaw"',
          [EdgeHeaders.IpV4DatacenterName]: '"AWS"',
        })
        setEdgeResponseHeaders(headers, { ip_info: { v6: { address: '2001:db8::1' } } })
        expect(headers.has(EdgeHeaders.IpV4Address)).toEqual(false)
        expect(headers.has(EdgeHeaders.IpV4GeolocationCityName)).toEqual(false)
        expect(headers.has(EdgeHeaders.IpV4DatacenterName)).toEqual(false)
        expect(headers.get(EdgeHeaders.IpV6Address)).toEqual('2001:db8::1')
      })

      it('emits v6 ip_info headers when v6 info is provided', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: {
            v6: {
              address: '2001:db8::1',
              geolocation: { country_code: 'DE' },
              asn_name: 'V6 ISP',
            },
          },
        })
        expect(headers.get(EdgeHeaders.IpV6Address)).toEqual('2001:db8::1')
        expect(headers.get(EdgeHeaders.IpV6GeolocationCountryCode)).toEqual('"DE"')
        expect(headers.get(EdgeHeaders.IpV6AsnName)).toEqual('"V6 ISP"')
      })
    })

    describe('proxy', () => {
      it('emits all proxy headers when proxy is detected', () => {
        const headers = new Headers()
        const lastSeenAt = new Date('2024-12-11T14:53:53Z')
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          proxy: true,
          proxy_confidence: 'medium',
          proxy_details: { proxy_type: 'residential', last_seen_at: lastSeenAt, provider: 'Example' },
        })
        expect(headers.get(EdgeHeaders.Proxy)).toEqual('?1')
        expect(headers.get(EdgeHeaders.ProxyConfidence)).toEqual('"medium"')
        expect(headers.get(EdgeHeaders.ProxyDetailsProxyType)).toEqual('"residential"')
        expect(headers.get(EdgeHeaders.ProxyDetailsLastSeenAt)).toEqual(`@${Math.trunc(lastSeenAt.getTime() / 1000)}`)
        expect(headers.get(EdgeHeaders.ProxyDetailsProvider)).toEqual('"Example"')
      })

      it('skips proxy sub-headers that have no value, even when proxy is detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          proxy: true,
        })
        expect(headers.get(EdgeHeaders.Proxy)).toEqual('?1')
        expect(headers.has(EdgeHeaders.ProxyConfidence)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsProxyType)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsLastSeenAt)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsProvider)).toEqual(false)
      })

      it('does not emit any proxy headers when proxy is not detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          proxy: false,
          // these sub-fields must be ignored entirely when proxy is not detected
          proxy_confidence: 'high',
          proxy_details: { proxy_type: 'residential', provider: 'Example' },
        })
        expect(headers.has(EdgeHeaders.Proxy)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyConfidence)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsProxyType)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsProvider)).toEqual(false)
      })

      it('clears stale proxy headers when proxy becomes undetected', () => {
        const headers = new Headers({
          [EdgeHeaders.Proxy]: '?1',
          [EdgeHeaders.ProxyConfidence]: '"medium"',
          [EdgeHeaders.ProxyDetailsProvider]: '"Example"',
        })
        setEdgeResponseHeaders(headers, { ip_info: { v4: { address: '1.2.3.4' } } })
        expect(headers.has(EdgeHeaders.Proxy)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyConfidence)).toEqual(false)
        expect(headers.has(EdgeHeaders.ProxyDetailsProvider)).toEqual(false)
      })
    })

    describe('vpn', () => {
      it('emits only the true vpn method headers when vpn is detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          vpn: true,
          vpn_confidence: 'high',
          vpn_methods: {
            timezone_mismatch: true,
            public_vpn: false,
            auxiliary_mobile: false,
            os_mismatch: false,
            relay: true,
          },
        })
        expect(headers.get(EdgeHeaders.Vpn)).toEqual('?1')
        expect(headers.get(EdgeHeaders.VpnConfidence)).toEqual('"high"')
        expect(headers.get(EdgeHeaders.VpnMethodsTimezoneMismatch)).toEqual('?1')
        expect(headers.get(EdgeHeaders.VpnMethodsRelay)).toEqual('?1')
        expect(headers.has(EdgeHeaders.VpnMethodsPublicVpn)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnMethodsAuxiliaryMobile)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnMethodsOsMismatch)).toEqual(false)
      })

      it('does not emit any vpn headers when vpn is not detected', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          vpn: false,
          vpn_confidence: 'high',
          vpn_methods: { relay: true },
        })
        expect(headers.has(EdgeHeaders.Vpn)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnConfidence)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnMethodsRelay)).toEqual(false)
      })

      it('clears stale vpn headers when vpn becomes undetected', () => {
        const headers = new Headers({
          [EdgeHeaders.Vpn]: '?1',
          [EdgeHeaders.VpnConfidence]: '"high"',
          [EdgeHeaders.VpnMethodsRelay]: '?1',
        })
        setEdgeResponseHeaders(headers, { ip_info: { v4: { address: '1.2.3.4' } } })
        expect(headers.has(EdgeHeaders.Vpn)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnConfidence)).toEqual(false)
        expect(headers.has(EdgeHeaders.VpnMethodsRelay)).toEqual(false)
      })
    })

    describe('ip_blocklist', () => {
      it('emits tor_node header only when it is true', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          ip_blocklist: { tor_node: true },
        })
        expect(headers.get(EdgeHeaders.IpBlocklistTorNode)).toEqual('?1')
      })

      it('omits tor_node header when false or absent', () => {
        const headers = new Headers()
        setEdgeResponseHeaders(headers, {
          ip_info: { v4: { address: '1.2.3.4' } },
          ip_blocklist: { tor_node: false },
        })
        expect(headers.has(EdgeHeaders.IpBlocklistTorNode)).toEqual(false)
      })

      it('clears stale tor_node header when blocklist is absent', () => {
        const headers = new Headers({ [EdgeHeaders.IpBlocklistTorNode]: '?1' })
        setEdgeResponseHeaders(headers, { ip_info: { v4: { address: '1.2.3.4' } } })
        expect(headers.has(EdgeHeaders.IpBlocklistTorNode)).toEqual(false)
      })
    })
  })
})
