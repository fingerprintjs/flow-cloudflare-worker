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
      displayName: 'Default Rule Allow Worker',
      host: getTestProjectHost('default-rule-allow'),
      testMatch: [sharedTests, /defaultRuleAllow\/.+\.test\.ts/],
      projectName: 'default-rule-allow',
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
      displayName: 'Default Rule Block Worker',
      host: getTestProjectHost('default-rule-block'),
      testMatch: [sharedTests, /defaultRuleBlock\/.+\.test\.ts/],
      projectName: 'default-rule-block',
    }),
  ] satisfies TestProject[]
}
