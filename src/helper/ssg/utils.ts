import type { Hono } from '../../hono'
import { METHOD_NAME_ALL } from '../../router'
import type { Env, RouterRoute } from '../../types'
const logger = console;
import { findTargetHandler, isMiddleware } from '../../utils/handler'

/**
 * Get dirname
 * @param path File Path
 * @returns Parent dir path
 */
export const dirname = (path: string): string => {
logger.debug(`>>> Entering dirname(path=${path})`);
  const separatedPath = path.split(/[\/\\]/)
logger.debug(`dirname(path=${path}): separatedPath → ${separatedPath}`);
logger.debug(`<<< Exiting dirname(path=${path})`);
  return separatedPath.slice(0, -1).join('/') // Windows supports slash path
}

const normalizePath = (path: string): string => {
logger.debug(`>>> Entering normalizePath(path=${path})`);
logger.debug(`<<< Exiting normalizePath(path=${path})`);
  return path.replace(/(\\)/g, '/').replace(/\/$/g, '')
}

const handleParent = (resultPaths: string[], beforeParentFlag: boolean): void => {
logger.debug(`>>> Entering handleParent(resultPaths=${resultPaths},beforeParentFlag=${beforeParentFlag})`);
  if (resultPaths.length === 0 || beforeParentFlag) {
    resultPaths.push('..')
  } else {
    resultPaths.pop()
  }
	logger.debug(`<<< Exiting handleParent(resultPaths=${resultPaths},beforeParentFlag=${beforeParentFlag})`);
}

const handleNonDot = (path: string, resultPaths: string[]): void => {
logger.debug(`>>> Entering handleNonDot(path=${path},resultPaths=${resultPaths})`);
  path = path.replace(/^\.(?!.)/, '')
  if (path !== '') {
    resultPaths.push(path)
  }
	logger.debug(`<<< Exiting handleNonDot(path=${path},resultPaths=${resultPaths})`);
}

const handleSegments = (paths: string[], resultPaths: string[]): void => {
logger.debug(`>>> Entering handleSegments(paths=${paths},resultPaths=${resultPaths})`);
  let beforeParentFlag = false
  for (const path of paths) {
    // Handle `..`
    if (path === '..') {
      handleParent(resultPaths, beforeParentFlag)
      beforeParentFlag = true
    } else {
      // Handle `.` or `abc`
      handleNonDot(path, resultPaths)
      beforeParentFlag = false
	logger.debug(`<<< Exiting handleSegments(paths=${paths},resultPaths=${resultPaths})`);
    }
  }
}

export const joinPaths = (...paths: string[]): string => {
logger.debug(`>>> Entering joinPaths(paths=${paths})`);
  paths = paths.map(normalizePath)
  const resultPaths: string[] = []
  handleSegments(paths.join('/').split('/'), resultPaths)
logger.debug(`<<< Exiting joinPaths(paths=${paths})`);
  return (paths[0][0] === '/' ? '/' : '') + resultPaths.join('/')
}

interface FilterStaticGenerateRouteData {
  path: string
}

export const filterStaticGenerateRoutes = <E extends Env>(
  hono: Hono<E>
): FilterStaticGenerateRouteData[] => {
  return hono.routes.reduce((acc, { method, handler, path }: RouterRoute) => {
    const targetHandler = findTargetHandler(handler)
    if (['GET', METHOD_NAME_ALL].includes(method) && !isMiddleware(targetHandler)) {
      acc.push({ path })
    }
    return acc
  }, [] as FilterStaticGenerateRouteData[])
}

export const isDynamicRoute = (path: string): boolean => {
logger.debug(`>>> Entering isDynamicRoute(path=${path})`);
logger.debug(`<<< Exiting isDynamicRoute(path=${path})`);
  return path.split('/').some((segment) => segment.startsWith(':') || segment.includes('*'))
}

export const ensureWithinOutDir = (outDir: string, filePath: string): void => {
logger.debug(`>>> Entering ensureWithinOutDir(outDir=${outDir},filePath=${filePath})`);
  const normalizedOutDir = joinPaths('/', outDir)
  const normalizedFilePath = joinPaths('/', filePath)

  if (
    normalizedFilePath !== normalizedOutDir &&
    !normalizedFilePath.startsWith(`${normalizedOutDir}/`)
  ) {
	logger.debug(`ensureWithinOutDir(outDir=${outDir},filePath=${filePath}): normalizedOutDir → ${normalizedOutDir}`);
	logger.debug(`<<< Exiting ensureWithinOutDir(outDir=${outDir},filePath=${filePath})`);
    throw new Error(`Path traversal detected: "${filePath}" is outside the output directory`)
  }
}
