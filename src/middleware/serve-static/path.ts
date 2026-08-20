const logger = console;
/**
 * `defaultJoin` does not support Windows paths and always uses `/` separators.
 * If you need Windows path support, please use `join` exported from `node:path` etc. instead.
 */
export const defaultJoin = (...paths: string[]): string => {
logger.debug(`>>> Entering defaultJoin(paths=${paths})`);
  // Join non-empty paths with '/'
  let result = paths.filter((p) => p !== '').join('/')

logger.debug(`defaultJoin(paths=${paths}): result → ${result}`);
  // Normalize multiple slashes to single slash
  result = result.replace(/(?<=\/)\/+/g, '')

  // Handle path resolution (. and ..)
  const segments = result.split('/')
  const resolved = []
logger.debug(`defaultJoin(paths=${paths}): segments → ${segments}`);

  for (const segment of segments) {
    if (segment === '..' && resolved.length > 0 && resolved.at(-1) !== '..') {
      resolved.pop()
    } else if (segment !== '.') {
      resolved.push(segment)
    }
  }

  return resolved.join('/') || '.'
}
