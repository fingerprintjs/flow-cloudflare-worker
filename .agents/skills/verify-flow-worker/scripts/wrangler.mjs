#!/usr/bin/env node
// Runs wrangler against a throwaway test worker. Run from the repo root:
//   node .agents/skills/verify-flow-worker/scripts/wrangler.mjs [--env-file <file>] <worker-name> <wrangler args...>
//
// Settings come from e2e/.env.local (the e2e suite's file), then from each --env-file on top.
// On first use it writes .wrangler/verify/<worker-name>.jsonc from wrangler.example.jsonc.
// Edit that file for test-specific vars; delete it to regenerate.
// `deploy` also uploads the Fingerprint settings as worker secrets, so they never appear in the config.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseEnv } from 'node:util'

const FINGERPRINT_SECRETS = [
  'FP_PUBLIC_KEY',
  'FP_SECRET_KEY',
  'FP_RULESET_ID',
  'FP_REGION',
  'FP_CDN_HOST',
  'FP_INGRESS_BASE_HOST',
]

function fail(message) {
  console.error(message)
  process.exit(1)
}

const args = process.argv.slice(2)
const envFiles = ['e2e/.env.local']
while (args[0] === '--env-file') {
  envFiles.push(args[1])
  args.splice(0, 2)
}
const [name, ...wranglerArgs] = args

if (!name || wranglerArgs.length === 0) {
  fail('Usage: wrangler.mjs [--env-file <file>] <worker-name> <wrangler args...>')
}
if (!name.startsWith('verify-')) {
  fail(`Worker name must start with "verify-" so it can't overwrite a real worker: ${name}`)
}
// These would let wrangler target a different worker than the checked name.
const overrideFlag = wranglerArgs.find((arg) => /^(--name|--config|-c|--env|-e)(=|$)/.test(arg))
if (overrideFlag) {
  fail(`${overrideFlag} isn't allowed: the script sets the worker name and config itself.`)
}

for (const file of envFiles) {
  if (!existsSync(file)) {
    fail(`Missing ${file}. For e2e/.env.local, copy e2e/.env.dist there and ask the user to fill it in.`)
  }
  // Later files override earlier ones.
  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
    process.env[key] = value
  }
}

const configPath = `.wrangler/verify/${name}.jsonc`

if (!existsSync(configPath)) {
  const config = JSON.parse(readFileSync('wrangler.example.jsonc', 'utf8'))

  // These are uploaded as secrets, and a key can't be both a var and a secret.
  for (const key of FINGERPRINT_SECRETS) {
    delete config.vars[key]
  }

  config.name = name
  config.routes = [{ pattern: `${name}.${process.env.TEST_DOMAIN}`, custom_domain: true }]
  // The build output is already bundled; wrangler can't re-bundle the `?raw` imports in src.
  config.main = '../../dist/flow_cloudflare_worker/index.js'
  config.no_bundle = true

  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(`Wrote ${configPath}`)
}

const status = wrangler(wranglerArgs)

if (status === 0 && wranglerArgs[0] === 'deploy') {
  const secrets = Object.fromEntries(
    FINGERPRINT_SECRETS.filter((key) => process.env[key]).map((key) => [key, process.env[key]])
  )
  // `secret bulk` without a file reads JSON from stdin.
  process.exit(wrangler(['secret', 'bulk'], JSON.stringify(secrets)))
}
process.exit(status)

function wrangler(wranglerArgs, input) {
  const result = spawnSync('pnpm', ['exec', 'wrangler', '--config', configPath, ...wranglerArgs], {
    input,
    stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
  })
  return result.status ?? 1
}
