import { TestWorkerProjectData } from './types'
import { getTestProjectBaseUrl } from './env'

const sharedTests = /shared\/.+\.test\.ts/

export function getTestProjects() {
  return [
    {
      name: 'Default Rule Allow Worker',
      baseUrl: getTestProjectBaseUrl('default-rule-allow'),
      testMatch: [sharedTests, /defaultRuleAllow\/.+\.test\.ts/],
      project: 'default-rule-allow',
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
    },
    {
      name: 'Default Rule Block Worker',
      baseUrl: getTestProjectBaseUrl('default-rule-block'),
      testMatch: [sharedTests, /defaultRuleBlock\/.+\.test\.ts/],
      project: 'default-rule-block',
    },
  ] satisfies TestWorkerProjectData[]
}
