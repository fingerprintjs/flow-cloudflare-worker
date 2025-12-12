// This is the only file that can call the console
/* eslint-disable no-console */
import type { Logger, LogLevel } from '../../shared/types'

const noop = () => {}

const ERROR_LOGGER: Logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error(...data) {
    console.error(...data)
  },
}

const WARN_LOGGER: Logger = {
  ...ERROR_LOGGER,
  warn(...data) {
    console.warn(...data)
  },
}

const INFO_LOGGER: Logger = {
  ...WARN_LOGGER,
  info(...data) {
    console.info(...data)
  },
}

const DEBUG_LOGGER: Logger = {
  ...INFO_LOGGER,
  debug(...data) {
    console.debug(...data)
  },
}

// This template will be replaced during injection by the worker.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const LOG_LEVEL: LogLevel = '<LOG_LEVEL>' as unknown as LogLevel

function initLogger(): Logger {
  switch (LOG_LEVEL) {
    case 'info':
      return INFO_LOGGER
    case 'warn':
      return WARN_LOGGER
    case 'debug':
      return DEBUG_LOGGER
    case 'error':
    default:
      return ERROR_LOGGER
  }
}

export const logger: Logger = initLogger()
