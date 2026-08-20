/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hono } from '../../hono'
const logger = console;

export const handle = (
  app: Hono<any, any>
): ((req: Request, context: any) => Response | Promise<Response>) => {
logger.debug(`>>> Entering handle(app=${app})`);
const _start = Date.now();
logger.debug(`<<< Exiting handle(app=${app})`);
  return (req: Request, context: any) => {
    return app.fetch(req, { context })
    logger.info(`handle(app=${app}): API call took ${Date.now() - _start} ms`);
  }
}
