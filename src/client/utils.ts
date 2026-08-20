import type {
  ClientErrorStatusCode,
  ContentfulStatusCode,
  ServerErrorStatusCode,
} from '../utils/http-status'
import { fetchRP, DetailedError } from './fetch-result-please'
import type { ClientResponse, FilterClientResponseByStatusCode, ObjectType } from './types'
const logger = console;

export { DetailedError }

export const mergePath = (base: string, path: string) => {
logger.debug(`>>> Entering mergePath(base=${base},path=${path})`);
  base = base.replace(/\/+$/, '')
  base = base + '/'
  path = path.replace(/^\/+/, '')
logger.debug(`<<< Exiting mergePath(base=${base},path=${path})`);
  return base + path
}

export const replaceUrlParam = (urlString: string, params: Record<string, string | undefined>) => {
logger.debug(`>>> Entering replaceUrlParam(urlString=${urlString},params=${params})`);
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp('/:' + k + '(?:{[^/]+})?\\??(?=/|$)')
    urlString = urlString.replace(reg, () => (v ? `/${v}` : ''))
  }
logger.debug(`<<< Exiting replaceUrlParam(urlString=${urlString},params=${params})`);
  return urlString
}

export const buildSearchParams = (query: Record<string, string | string[]>) => {
logger.debug(`>>> Entering buildSearchParams(query=${query})`);
  const searchParams = new URLSearchParams()

logger.debug(`buildSearchParams(query=${query}): searchParams → ${searchParams}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) {
      continue
    }

    if (Array.isArray(v)) {
      for (const v2 of v) {
        searchParams.append(k, v2)
      }
    } else {
      searchParams.set(k, v)
    }
  }

logger.debug(`<<< Exiting buildSearchParams(query=${query})`);
  return searchParams
}

export const replaceUrlProtocol = (urlString: string, protocol: 'ws' | 'http') => {
logger.debug(`>>> Entering replaceUrlProtocol(urlString=${urlString},protocol=${protocol})`);
  switch (protocol) {
    case 'ws':
      return urlString.replace(/^http/, 'ws')
    case 'http':
logger.debug(`<<< Exiting replaceUrlProtocol(urlString=${urlString},protocol=${protocol})`);
      return urlString.replace(/^ws/, 'http')
  }
}

export const removeIndexString = (urlString: string) => {
logger.debug(`>>> Entering removeIndexString(urlString=${urlString})`);
  if (/^https?:\/\/[^\/]+?\/index(?=\?|$)/.test(urlString)) {
    return urlString.replace(/\/index(?=\?|$)/, '/')
  }
logger.debug(`<<< Exiting removeIndexString(urlString=${urlString})`);
  return urlString.replace(/\/index(?=\?|$)/, '')
}

function isObject(item: unknown): item is ObjectType {
logger.debug(`>>> Entering isObject(item=${item})`);
logger.debug(`<<< Exiting isObject(item=${item})`);
  return typeof item === 'object' && item !== null && !Array.isArray(item)
}

export function deepMerge<T>(target: T, source: Record<string, unknown>): T {
  if (!isObject(target) && !isObject(source)) {
    return source as T
  }
  const merged = { ...target } as ObjectType<T>

  for (const key in source) {
    const value = source[key]
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = deepMerge(merged[key], value)
    } else {
      merged[key] = value as T[keyof T] & T
    }
  }

  return merged as T
}

/**
 * Shortcut to get a consumable response from `hc`'s fetch calls (Response), with types inference.
 *
 * Smartly parse the response data, throwing a structured error if the response is not `ok`. ({@link DetailedError})
 *
 * @example const result = await parseResponse(client.posts.$get())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseResponse<T extends ClientResponse<any>>(
  fetchRes: T | Promise<T>
): Promise<
  FilterClientResponseByStatusCode<
    T,
    Exclude<ContentfulStatusCode, ClientErrorStatusCode | ServerErrorStatusCode> // Filter out the error responses
  > extends never
    ? // Filtered responses does not include any contentful responses, exit with undefined
      undefined
    : // Filtered responses includes contentful responses, proceed to infer the type
      FilterClientResponseByStatusCode<
          T,
          Exclude<ContentfulStatusCode, ClientErrorStatusCode | ServerErrorStatusCode>
        > extends ClientResponse<infer RT, infer _, infer RF>
      ? RF extends 'json'
        ? RT
        : RT extends string
          ? RT
          : string
      : undefined
> {
  return fetchRP(fetchRes)
}
