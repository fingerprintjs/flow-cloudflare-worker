import { EdgeResponse } from '../../src/worker/fingerprint/identificationClientTypes'

export const mockEdgeResponseIpV4: EdgeResponse = {
  bot_info: {
    category: 'ai_agent',
    provider: 'OpenAI',
    provider_url: 'https://openai.com',
    name: 'ChatGPT Agent',
    identity: 'signed',
    confidence: 'high',
  },
  ip_info: {
    v4: {
      address: '94.142.239.124',
      geolocation: {
        accuracy_radius: 20,
        latitude: 50.05,
        longitude: 14.4,
        postal_code: '150 00',
        timezone: 'Europe/Prague',
        city_name: 'Prague',
        country_code: 'CZ',
        country_name: 'Czechia',
        continent_code: 'EU',
        continent_name: 'Europe',
        subdivisions: [
          {
            iso_code: '10',
            name: 'Hlavni mesto Praha',
          },
        ],
      },
      asn: '7922',
      asn_name: 'COMCAST-7922',
      asn_network: '73.136.0.0/13',
      asn_type: 'isp',
      datacenter_result: true,
      datacenter_name: 'DediPath',
    },
    v6: undefined,
  },
}

export const mockEdgeResponseIpV6: EdgeResponse = {
  bot_info: {
    category: 'ai_agent',
    provider: 'OpenAI',
    provider_url: 'https://openai.com',
    name: 'ChatGPT Agent',
    identity: 'signed',
    confidence: 'high',
  },
  ip_info: {
    v4: undefined,
    v6: {
      address: '2001:db8:3333:4444:5555:6666:7777:8888',
      geolocation: {
        accuracy_radius: 5,
        latitude: 49.982,
        longitude: 36.2566,
        postal_code: '10112',
        timezone: 'Europe/Berlin',
        city_name: 'Berlin',
        country_code: 'DE',
        country_name: 'Germany',
        continent_code: 'EU',
        continent_name: 'Europe',
        subdivisions: [
          {
            iso_code: 'BE',
            name: 'Land Berlin',
          },
        ],
      },
      asn: '6805',
      asn_name: 'Telefonica Germany',
      asn_network: '2a02:3100::/24',
      asn_type: 'isp',
      datacenter_result: false,
      datacenter_name: '',
    },
  },
}
