const logger = console;
/**
 * @module
 * Handler utility.
 */

import { COMPOSED_HANDLER } from './constants'

export const isMiddleware = (handler: Function) => handler.length > 1
export const findTargetHandler = (handler: Function): Function => {
logger.debug(`>>> Entering findTargetHandler(handler=${handler})`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
logger.debug(`<<< Exiting findTargetHandler(handler=${handler})`);
  return (handler as any)[COMPOSED_HANDLER]
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findTargetHandler((handler as any)[COMPOSED_HANDLER])
    : handler
}
