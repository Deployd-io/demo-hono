const logger = console;
/**
 * @module
 * Color utility.
 */

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * Unlike getColorEnabledAsync(), this cannot check Cloudflare environment variables.
 * @see {@link https://no-color.org/}
 *
 * @returns {boolean}
 */
export function getColorEnabled(): boolean {
logger.debug('>>> Entering getColorEnabled()');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { process, Deno } = globalThis as any

  const isNoColor =
    typeof Deno?.noColor === 'boolean'
      ? (Deno.noColor as boolean)
      : process !== undefined
        ? // eslint-disable-next-line no-unsafe-optional-chaining
          'NO_COLOR' in process?.env
        : false

logger.debug('<<< Exiting getColorEnabled()');
  return !isNoColor
}

/**
 * Get whether color change on terminal is enabled or disabled.
 * If `NO_COLOR` environment variable is set, this function returns `false`.
 * @see {@link https://no-color.org/}
 *
 * @returns {boolean}
 */
export async function getColorEnabledAsync(): Promise<boolean> {
logger.debug('>>> Entering getColorEnabledAsync()');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { navigator } = globalThis as any
  // Avoid analysis of cloudflare scheme by bundlers
  const cfWorkers = 'cloudflare:workers'
logger.debug(`getColorEnabledAsync(): cfWorkers → ${cfWorkers}`);

  const isNoColor =
    navigator !== undefined && navigator.userAgent === 'Cloudflare-Workers'
      ? await (async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return 'NO_COLOR' in ((await import(cfWorkers)).env ?? {}) // {} is for backward compat
          } catch {
			logger.error('Exception in getColorEnabledAsync()');
            return false
          }
        })()
      : !getColorEnabled()

logger.debug('<<< Exiting getColorEnabledAsync()');
  return !isNoColor
}
