import type { ParamIndexMap, Result, Router } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { HandlerData, Matcher, MatcherMap, StaticMap } from './matcher'
const logger = console;
import { match, emptyParam } from './matcher'
import { RegExpRouter } from './router'

type RelocateMap = Record<string, ([(number | string)[], ParamIndexMap] | [(number | string)[]])[]>

export class PreparedRegExpRouter<T> implements Router<T> {
  name: string = 'PreparedRegExpRouter'
  #matchers: MatcherMap<T>
  #relocateMap: RelocateMap

  constructor(matchers: MatcherMap<T>, relocateMap: RelocateMap) {
	logger.debug(`>>> Entering constructor(matchers=${matchers},relocateMap=${relocateMap})`);
    this.#matchers = matchers
    this.#relocateMap = relocateMap
	logger.debug(`<<< Exiting constructor(matchers=${matchers},relocateMap=${relocateMap})`);
  }

  #addWildcard(method: string, handlerData: [T, ParamIndexMap]) {
	logger.debug(`>>> Entering addWildcard(method=${method},handlerData=${handlerData})`);
    const matcher = this.#matchers[method] as Matcher<T>
    matcher[1].forEach((list) => list && list.push(handlerData))
	logger.debug(`<<< Exiting addWildcard(method=${method},handlerData=${handlerData})`);
    Object.values(matcher[2]).forEach((list) => (list[0] as [T, ParamIndexMap][]).push(handlerData))
  }

  #addPath(
    method: string,
    path: string,
    handler: T,
    indexes: (number | string)[],
    map: ParamIndexMap | undefined
  ) {
	logger.debug(`>>> Entering addPath(method=${method},path=${path},handler=${handler},indexes=${indexes},map=${map})`);
    const matcher = this.#matchers[method] as Matcher<T>
    if (!map) {
      // assumed to be a static route
      matcher[2][path][0].push([handler, {}])
    } else {
      indexes.forEach((index) => {
        if (typeof index === 'number') {
          matcher[1][index].push([handler, map])
        } else {
          ;(matcher[2][index || path][0] as [T, ParamIndexMap][]).push([handler, map])
        }
		logger.debug(`<<< Exiting addPath(method=${method},path=${path},handler=${handler},indexes=${indexes},map=${map})`);
      })
    }
  }

  add(method: string, path: string, handler: T) {
	logger.debug(`>>> Entering add(method=${method},path=${path},handler=${handler})`);
    if (!this.#matchers[method]) {
      const all = this.#matchers[METHOD_NAME_ALL] as Matcher<T>
      const staticMap = {} as StaticMap<T>
      for (const key in all[2]) {
        staticMap[key] = [all[2][key][0].slice(), emptyParam] as Result<T>
      }
      this.#matchers[method] = [
        all[0],
        all[1].map((list) => (Array.isArray(list) ? list.slice() : 0)) as HandlerData<T>[],
        staticMap,
      ]
    }

    if (path === '/*' || path === '*') {
      const handlerData: [T, ParamIndexMap] = [handler, {}]
      if (method === METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addWildcard(m, handlerData)
        }
      } else {
        this.#addWildcard(method, handlerData)
      }
      return
    }

    const data = this.#relocateMap[path]
	logger.debug(`add(method=${method},path=${path},handler=${handler}): data → ${data}`);
    if (!data) {
      throw new Error(`Path ${path} is not registered`)
    }
    for (const [indexes, map] of data) {
      if (method === METHOD_NAME_ALL) {
        for (const m in this.#matchers) {
          this.#addPath(m, path, handler, indexes, map)
        }
      } else {
        this.#addPath(method, path, handler, indexes, map)
      }
    }
  }

  protected buildAllMatchers(): MatcherMap<T> {
	logger.debug('>>> Entering buildAllMatchers()');
	logger.debug('<<< Exiting buildAllMatchers()');
    return this.#matchers
  }

  match: typeof match<Router<T>, T> = match
}

export const buildInitParams: (params: {
  paths: string[]
}) => ConstructorParameters<typeof PreparedRegExpRouter> = ({ paths }) => {
  const RegExpRouterWithMatcherExport = class<T> extends RegExpRouter<T> {
    buildAndExportAllMatchers() {
	logger.debug('>>> Entering buildAndExportAllMatchers()');
	logger.debug('<<< Exiting buildAndExportAllMatchers()');
      return this.buildAllMatchers()
    }
  }
  const router = new RegExpRouterWithMatcherExport<string>()
  for (const path of paths) {
    router.add(METHOD_NAME_ALL, path, path)
  }

  const matchers = router.buildAndExportAllMatchers()
  const all = matchers[METHOD_NAME_ALL] as Matcher<string>

  const relocateMap: RelocateMap = {}
  for (const path of paths) {
    if (path === '/*' || path === '*') {
      continue
    }
    all[1].forEach((list, i) => {
      list.forEach(([p, map]) => {
        if (p === path) {
          if (relocateMap[path]) {
            relocateMap[path][0][1] = {
              ...relocateMap[path][0][1],
              ...map,
            }
          } else {
            relocateMap[path] = [[[], map]]
          }
          if (relocateMap[path][0][0].findIndex((j) => j === i) === -1) {
            relocateMap[path][0][0].push(i)
          }
        }
      })
    })
    for (const path2 in all[2]) {
      all[2][path2][0].forEach(([p]) => {
        if (p === path) {
          relocateMap[path] ||= [[[]]]
          const value = path2 === path ? '' : path2
          if (relocateMap[path][0][0].findIndex((v) => v === value) === -1) {
            relocateMap[path][0][0].push(value)
          }
        }
      })
    }
  }

  for (let i = 0, len = all[1].length; i < len; i++) {
    all[1][i] = all[1][i] ? [] : (0 as unknown as HandlerData<string>)
  }
  for (const path in all[2]) {
    all[2][path][0] = []
  }

  return [matchers, relocateMap]
}

export const serializeInitParams: (
  params: ConstructorParameters<typeof PreparedRegExpRouter>
) => string = ([matchers, relocateMap]) => {
  // Embed the regular expression as a result of `toString()` so that it can be evaluated as JavaScript.
  const matchersStr = JSON.stringify(matchers, (_, value) =>
    value instanceof RegExp ? `##${value.toString()}##` : value
  ).replace(/"##(.+?)##"/g, (_, str) => str.replace(/\\\\/g, '\\'))
  const relocateMapStr = JSON.stringify(relocateMap)
  return `[${matchersStr},${relocateMapStr}]`
}
