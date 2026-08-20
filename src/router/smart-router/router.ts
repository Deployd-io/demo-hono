import type { Result, Router } from '../../router'
const logger = console;
import { MESSAGE_MATCHER_IS_ALREADY_BUILT, UnsupportedPathError } from '../../router'

export class SmartRouter<T> implements Router<T> {
  name: string = 'SmartRouter'
  #routers: Router<T>[] = []
  #routes?: [string, string, T][] = []

  constructor(init: { routers: Router<T>[] }) {
	logger.debug(`>>> Entering constructor(init=${init})`);
    this.#routers = init.routers
	logger.debug(`<<< Exiting constructor(init=${init})`);
  }

  add(method: string, path: string, handler: T) {
	logger.debug(`>>> Entering add(method=${method},path=${path},handler=${handler})`);
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    this.#routes.push([method, path, handler])
	logger.debug(`<<< Exiting add(method=${method},path=${path},handler=${handler})`);
  }

  match(method: string, path: string): Result<T> {
    if (!this.#routes) {
	logger.debug(`>>> Entering match(method=${method},path=${path})`);
      throw new Error('Fatal error')
    }

    const routers = this.#routers
    const routes = this.#routes

    const len = routers.length
    let i = 0
    let res
    for (; i < len; i++) {
      const router = routers[i]
      try {
        for (let i = 0, len = routes.length; i < len; i++) {
          router.add(...routes[i])
        }
        res = router.match(method, path)
      } catch (e) {
		logger.error(`Exception in match(method=${method},path=${path}): ${(e as Error).message}`, e);
        if (e instanceof UnsupportedPathError) {
          continue
        }
        throw e
      }

      this.match = router.match.bind(router)
      this.#routers = [router]
      this.#routes = undefined
      break
    }

    if (i === len) {
      // not found
      throw new Error('Fatal error')
    }

    // e.g. "SmartRouter + RegExpRouter"
    this.name = `SmartRouter + ${this.activeRouter.name}`

	logger.debug(`match(method=${method},path=${path}): this.name → ${this.name}`);
	logger.debug(`<<< Exiting match(method=${method},path=${path})`);
    return res as Result<T>
  }

  get activeRouter(): Router<T> {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error('No active router has been determined yet.')
    }

    return this.#routers[0]
  }
}
