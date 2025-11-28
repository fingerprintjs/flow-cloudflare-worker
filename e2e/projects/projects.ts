import { getTestProjectHost } from '../utils/env'
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
  return [
    new TestProject({
      testAppFn: spaApp,
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
      testAppFn: spaApp,
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
      testAppFn: spaApp,
      displayName: 'Block Based On Ruleset Worker',
      host: getTestProjectHost('ruleset-based-block'),
      testMatch: [sharedTests, /rulesetBasedBlock\/.+\.test\.ts/],
      projectName: 'ruleset-based-block',
    }),
  ] satisfies TestProject[]
}
