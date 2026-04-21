import { getEnv, getTestDomain, getTestHost, getTestProjectHost } from '../utils/env'
import { TestProject } from './TestProject'
import { spaApp } from '../deploy/testApps/reactSpa'

const sharedTests = /shared\/.+\.test\.ts/

/**
 * Retrieves a list of test projects defined for specific configurations and rules.
 *
 * @return {TestProject[]} An array of `TestProject` objects containing configurations, hosts,
 *         test match criteria, project names, and any additional settings such as flow worker variables.
 */
export function getTestProjects(): TestProject[] {
  const allTestProjects = [
    new TestProject({
      testAppFn: spaApp(),
      displayName: 'Fallback Action Allow Worker',
      host: getTestProjectHost('fallback-action-allow'),
      testMatch: [sharedTests, /fallbackActionAllow\/.+\.test\.ts/],
      projectName: 'fallback-action-allow',
      flowWorker: {
        variables: {
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'allow',
            request_header_modifications: {
              set: [
                {
                  name: 'x-fallback-allowed',
                  value: 'true',
                },
              ],
            },
          },
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp(),
      displayName: 'Fallback Action Block Worker',
      host: getTestProjectHost('fallback-action-block'),
      testMatch: [sharedTests, /fallbackActionBlock\/.+\.test\.ts/],
      projectName: 'fallback-action-block',
      flowWorker: {
        variables: {
          FP_FAILURE_FALLBACK_ACTION: {
            type: 'block',
            status_code: 403,
            body: 'Access Forbidden due to default block rule.',
            headers: [],
          },
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp(),
      displayName: 'Block Based On Ruleset Worker',
      host: getTestProjectHost('ruleset-based-block'),
      testMatch: [sharedTests, /rulesetBasedBlock\/.+\.test\.ts/],
      projectName: 'ruleset-based-block',
    }),

    new TestProject({
      testAppFn: spaApp(),
      displayName: 'Log Level Config',
      host: getTestProjectHost('log-level-config'),
      testMatch: [/logLevelConfig\/.+\.test\.ts/],
      projectName: 'log-level-config',
      flowWorker: {
        variables: {
          FP_LOG_LEVEL: 'debug',
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp({
        // Serve the test app under an additional "cors-api" host
        additionalDomainPatterns: [getTestHost('cors-api')],
        vars: {
          CORS_ALLOWED_ORIGINS: `https://${getTestProjectHost('cors')}`,
        },
      }),
      displayName: 'CORS',
      host: getTestProjectHost('cors'),
      testMatch: [/cors\/.+\.test\.ts/],
      projectName: 'cors',
      flowWorker: {
        // In the same manner, the flow worker also needs to handle the additional host
        additionalDomainPatterns: [`${getTestHost('cors-api')}/api/*`],
        variables: {
          FP_LOG_LEVEL: 'debug',
          PROTECTED_APIS: [
            {
              url: `https://${getTestHost('cors-api')}/api/*`,
              method: 'POST',
            },
          ],
          IDENTIFICATION_PAGE_URLS: [`https://${getTestHost('cors-api')}`],
          // Deploy in monitor mode
          FP_RULESET_ID: '',
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp({
        // Serve the test app under an additional "cors-block-api" host
        additionalDomainPatterns: [getTestHost('cors-block-api')],
        vars: {
          CORS_ALLOWED_ORIGINS: `https://${getTestProjectHost('cors-block')}`,
        },
      }),
      displayName: 'CORS with blocking',
      host: getTestProjectHost('cors-block'),
      testMatch: [/corsBlock\/.+\.test\.ts/],
      projectName: 'cors-block',
      flowWorker: {
        // In the same manner, the flow worker also needs to handle the additional host
        additionalDomainPatterns: [`${getTestHost('cors-block-api')}/api/*`],
        variables: {
          FP_LOG_LEVEL: 'debug',
          PROTECTED_APIS: [
            {
              url: `https://${getTestHost('cors-block-api')}/api/*`,
              method: 'POST',
            },
          ],
          IDENTIFICATION_PAGE_URLS: [`https://${getTestHost('cors-block-api')}`],
          FP_RULESET_ID: getEnv('RULESET_BASED_BLOCK_FP_RULESET_ID'),
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp({
        // Serve the test app under an additional "cors-edge-api-monitor-mode" host
        additionalDomainPatterns: [getTestHost('cors-edge-api-monitor-mode-api')],
        vars: {
          CORS_ALLOWED_ORIGINS: `https://${getTestProjectHost('cors-edge-api-monitor-mode')}`,
        },
      }),
      displayName: 'CORS with Edge API in monitor mode',
      host: getTestProjectHost('cors-edge-api-monitor-mode'),
      testMatch: [/corsEdgeApiMonitorMode\/.+\.test\.ts/],
      projectName: 'cors-edge-api-monitor-mode',
      flowWorker: {
        // In the same manner, the flow worker also needs to handle the additional host
        additionalDomainPatterns: [`${getTestHost('cors-edge-api-monitor-mode-api')}/api/*`],
        variables: {
          FP_LOG_LEVEL: 'debug',
          PROTECTED_APIS: [
            {
              url: `https://${getTestHost('cors-edge-api-monitor-mode-api')}/api/*`,
              method: 'POST',
            },
          ],
          IDENTIFICATION_PAGE_URLS: [`https://${getTestHost('cors-edge-api-monitor-mode')}`],
          FP_EDGE_API: 'true',
          // Deploy in monitor mode
          FP_RULESET_ID: '',
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp({
        // Serve the test app under an additional "api-wildcard" subdomain
        additionalDomainPatterns: [getTestHost('api-wildcard')],
      }),
      displayName: 'Wildcard Protected API',
      host: getTestProjectHost('wildcard-protected-api'),
      testMatch: [/wildcardProtectedApi\/.+\.test\.ts/],
      projectName: 'wildcard-protected-api',
      flowWorker: {
        // Configure route for the api-wildcard subdomain
        additionalDomainPatterns: [`${getTestHost('api-wildcard')}/*`],
        variables: {
          FP_LOG_LEVEL: 'debug',
          // Configure PROTECTED_APIS with wildcard subdomain and wildcard path
          // This pattern should match https://*.{test-domain}/api/*
          PROTECTED_APIS: [
            {
              url: `https://*.${getTestDomain()}/api/*`,
              method: 'POST',
            },
          ],
          IDENTIFICATION_PAGE_URLS: [`https://${getTestProjectHost('wildcard-protected-api')}`],
        },
      },
    }),

    new TestProject({
      testAppFn: spaApp(),
      displayName: 'Edge API in monitor mode',
      host: getTestProjectHost('edge-api-monitor-mode'),
      testMatch: [sharedTests, /edgeApiMonitorMode\/.+\.test\.ts/],
      projectName: 'edge-api-monitor-mode',
      flowWorker: {
        variables: {
          FP_EDGE_API: 'true',

          // Deploy in monitor mode
          FP_RULESET_ID: '',
        },
      },
    }),
  ] satisfies TestProject[]

  const filter = process.env.TEST_PROJECTS_FILTER

  if (!filter) {
    return allTestProjects
  }

  return allTestProjects.filter((p) => p.projectName.match(filter) !== null || p.displayName.match(filter) !== null)
}
