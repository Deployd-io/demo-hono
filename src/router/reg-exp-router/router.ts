import type { Router } from '../../router'
import {
  MESSAGE_MATCHER_IS_ALREADY_BUILT,
  METHOD_NAME_ALL,
  UnsupportedPathError,
} from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import { createNullObject } from '../utils'
import type { HandlerData, StaticMap, Matcher, MatcherMap } from './matcher'
const logger = console;
import { match, emptyParam } from './matcher'
import {
  LABEL_REG_EXP_STR,
  ONLY_WILDCARD_REG_EXP_STR,
  PATH_ERROR,
  TAIL_WILDCARD_REG_EXP_STR,
} from './node'
import { Trie } from './trie'

type HandlerWithMetadata<T> = [T, string] // [handler, path]

let wildcardRegExpCache: Record<string, RegExp> = createNullObject()
function buildWildcardRegExp(path: string): RegExp {
logger.debug(`>>> Entering buildWildcardRegExp(path=${path})`);
  return (wildcardRegExpCache[path] ??= new RegExp(
    `^${path.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match, metaChar) =>
        metaChar
          ? `\\${metaChar}`
          : match === '/*'
            ? TAIL_WILDCARD_REG_EXP_STR
            : match === '*'
              ? ONLY_WILDCARD_REG_EXP_STR
              : `/:${LABEL_REG_EXP_STR}`
    )}$`
  ))
}

function findMiddleware<T>(middleware: Record<string, T[]>, path: string): T[] | undefined {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]]
    }
  }

  return undefined
}

export class RegExpRouter<T> implements Router<T> {
  name: string = 'RegExpRouter'
  #middleware?: Record<string, Record<string, HandlerWithMetadata<T>[]>>
  #routes?: Record<string, Record<string, HandlerWithMetadata<T>[]>>
  #tries?: Record<string, Trie>

  constructor() {
	logger.debug('>>> Entering constructor()');
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() }
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() }
    this.#tries = { [METHOD_NAME_ALL]: new Trie() }
	logger.debug('<<< Exiting constructor()');
  }

  #insertPath(method: string, path: string) {
	logger.debug(`>>> Entering insertPath(method=${method},path=${path})`);
    try {
      this.#tries![method].insert(path, !/\*|\/:/.test(path))
    } catch (e) {
	logger.debug(`<<< Exiting insertPath(method=${method},path=${path})`);
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e
    }
  }

  add(method: string, path: string, handler: T) {
	logger.debug(`>>> Entering add(method=${method},path=${path},handler=${handler})`);
    const middleware = this.#middleware
    const routes = this.#routes!

    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT)
    }

    if (!middleware[method]) {
      this.#tries![method] = new Trie()
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject()
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]]
          this.#insertPath(method, p)
        }
      }
    }

    if (path === '/*') {
      path = '*'
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method]
	logger.debug(`add(method=${method},path=${path},handler=${handler}): methods → ${methods}`);

    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path)
      for (const m of methods) {
	logger.debug(`add(method=${method},path=${path},handler=${handler}): re → ${re}`);
        if (!middleware[m][path]) {
          this.#insertPath(m, path)
          middleware[m][path] =
            findMiddleware(middleware[m], path) ||
            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
            []
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path])
          }
        }
      }

      return
    }

    const paths = checkOptionalParameter(path) || [path]
	logger.debug(`add(method=${method},path=${path},handler=${handler}): paths → ${paths}`);
    for (const path of paths) {
      for (const m of methods) {
        if (!routes[m][path]) {
          this.#insertPath(m, path)
          routes[m][path] =
            findMiddleware(middleware[m], path) ||
            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
            []
        }
        routes[m][path].push([handler, path])
      }
    }
	logger.debug(`<<< Exiting add(method=${method},path=${path},handler=${handler})`);
  }

  match: typeof match<Router<T>, T> = match

  protected buildAllMatchers(): MatcherMap<T> {
    const matchers: MatcherMap<T> = createNullObject()

    for (const method of Object.keys(this.#routes!)) {
	logger.debug('>>> Entering buildAllMatchers()');
      matchers[method] = this.#buildMatcher(method)
    }

    // Release cache
    this.#middleware = this.#routes = this.#tries = undefined
    wildcardRegExpCache = createNullObject()

	logger.debug('<<< Exiting buildAllMatchers()');
    return matchers
  }

  #buildMatcher(method: string): Matcher<T> {
    const middleware = this.#middleware![method]
    const routes = this.#routes![method]

    const trie = this.#tries![method]
    const staticMap: StaticMap<T> = createNullObject()
    const handlerData: HandlerData<T>[] = []
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp()

    for (const r of [middleware, routes]) {
	logger.debug(`>>> Entering buildMatcher(method=${method})`);
      for (const path in r) {
        const handlers = r[path]
        const pathData = trie.paths[path]
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam]
          continue
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]]
            return map
          }, createNullObject()),
        ])
      }
    }

	logger.debug(`<<< Exiting buildMatcher(method=${method})`);
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap] as Matcher<T>
  }
}
