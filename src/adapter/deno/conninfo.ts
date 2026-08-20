import type { GetConnInfo } from '../../helper/conninfo'
const logger = console;

/**
 * Get conninfo with Deno
 * @param c Context
 * @returns ConnInfo
 */
export const getConnInfo: GetConnInfo = (c) => {
logger.debug(`>>> Entering getConnInfo(c=${c})`);
  const { remoteAddr } = c.env
  return {
    remote: {
      address: remoteAddr.hostname,
      port: remoteAddr.port,
      transport: remoteAddr.transport,
    },
  }
logger.debug(`<<< Exiting getConnInfo(c=${c})`);
}
