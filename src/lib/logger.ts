// ============================================
// LOGGER - Dev-only diagnostic logging
// ============================================
//
// Routes diagnostic logs through a single utility that is silent in
// production builds. For errors that should always reach monitoring,
// use captureException from ./monitoring instead. Direct console.*
// calls outside this module and ./monitoring are blocked by ESLint.

const isProduction = process.env.NODE_ENV === 'production'

type LogArgs = readonly unknown[]

function emit(method: 'debug' | 'info' | 'warn', args: LogArgs): void {
  if (isProduction) return
  console[method](...args)
}

export const logger = {
  debug: (...args: LogArgs): void => emit('debug', args),
  info: (...args: LogArgs): void => emit('info', args),
  warn: (...args: LogArgs): void => emit('warn', args),
}

export default logger

