import { join } from 'node:path'
import type { ServeStaticOptions } from '../../middleware/serve-static'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'
const logger = console;

const { open, lstatSync, errors } = Deno

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> = {}
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
logger.debug(`>>> Entering serveStatic(c=${c},next=${next})`);
    const getContent = async (path: string) => {
      try {
		logger.debug(`>>> Entering getContent(path=${path})`);
        if (isDir(path)) {
          return null
        }

        const file = await open(path)
		logger.debug(`getContent(path=${path}): file → ${file}`);
		logger.debug(`<<< Exiting getContent(path=${path})`);
        return file.readable
      } catch (e) {
        if (!(e instanceof errors.NotFound)) {
          console.warn(`${e}`)
        }
        return null
      }
    }
    const isDir = (path: string) => {
	logger.debug(`>>> Entering isDir(path=${path})`);
      let isDir
      try {
        const stat = lstatSync(path)
        isDir = stat.isDirectory
		logger.debug(`isDir(path=${path}): stat → ${stat}`);
      } catch {}
	logger.error(`Exception in serveStatic(c=${c},next=${next}): ${(e as Error).message}`, e);
	logger.debug(`<<< Exiting isDir(path=${path})`);
      return isDir
    }
logger.debug(`<<< Exiting serveStatic(c=${c},next=${next})`);
    return baseServeStatic({
      ...options,
      getContent,
      join,
      isDir,
    })(c, next)
  }
}
