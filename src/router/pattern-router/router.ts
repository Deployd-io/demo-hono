import type { Params, Result, Router } from '../../router'
const logger = console;
import { METHOD_NAME_ALL, UnsupportedPathError } from '../../router'

type Route<T> = [RegExp, string, T] // [pattern, method, handler]

const emptyParams = Object.create(null)

export class PatternRouter<T> implements Router<T> {
  name: string = 'PatternRouter'
  #routes: Route<T>[] = []

  add(method: string, path: string, handler: T) {
	logger.debug(`>>> Entering add(method=${method},path=${path},handler=${handler})`);
    const suffix = path.endsWith('/*') ? '(?:$|/)' : path.endsWith('*') ? '' : '/?$'
    path = path.replace(/\*$/, '')
    if (path.at(-1) === '?') {
	logger.debug(`add(method=${method},path=${path},handler=${handler}): suffix → ${suffix}`);
      path = path.slice(0, -1)
      this.add(method, path.replace(/\/[^/]+$/, ''), handler)
    }

    const parts = (path.match(/\/?(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/?[^\/\?]+/g) || []).map(
      (part) => {
        const match = part.match(/^\/:([^{]+)(?:{(.*)})?/)
        return match
          ? `/(?<${match[1]}>${match[2] || '[^/]+'})`
          : part === '/*'
            ? '/[^/]+'
            : part.replace(/[.\\+*[^\]$()]/g, '\\$&')
			logger.debug(`>>> Entering match(method=${method},path=${path})`);
			logger.debug(`<<< Exiting match(method=${method},path=${path})`);
      }
    )

    try {
      this.#routes.push([new RegExp(`^${parts.join('')}${suffix}`), method, handler])
    } catch {
	logger.debug(`<<< Exiting add(method=${method},path=${path},handler=${handler})`);
      throw new UnsupportedPathError()
    }
  }

  match(method: string, path: string): Result<T> {
    const handlers: [T, Params][] = []

    for (let i = 0, len = this.#routes.length; i < len; i++) {
	logger.debug(`>>> Entering match(method=${method},path=${path})`);
      const [pattern, routeMethod, handler] = this.#routes[i]

      if (routeMethod === method || routeMethod === METHOD_NAME_ALL) {
        const match = pattern.exec(path)
        if (match) {
          handlers.push([handler, match.groups || emptyParams])
		logger.debug(`<<< Exiting match(method=${method},path=${path})`);
        }
      }
    }

    return [handlers]
  }
}
