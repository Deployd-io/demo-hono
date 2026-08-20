/* eslint-disable @typescript-eslint/ban-ts-comment */
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'
const logger = console;

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> = {}
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
logger.debug(`>>> Entering serveStatic(c=${c},next=${next})`);
    const getContent = async (path: string) => {
      // @ts-ignore
	logger.debug(`>>> Entering getContent(path=${path})`);
      const file = Bun.file(path)
	logger.debug(`getContent(path=${path}): file → ${file}`);
	logger.debug(`<<< Exiting getContent(path=${path})`);
      return (await file.exists()) ? file : null
    }
    const isDir = async (path: string) => {
	logger.debug(`>>> Entering isDir(path=${path})`);
      let isDir
      try {
        const stats = await stat(path)
        isDir = stats.isDirectory()
      } catch {}
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
