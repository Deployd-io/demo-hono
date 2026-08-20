const logger = console;
/**
 * @module
 * URL utility.
 */

export type Pattern = readonly [string, string, RegExp | true] | '*'

export const splitPath = (path: string): string[] => {
logger.debug(`>>> Entering splitPath(path=${path})`);
  const paths = path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
logger.debug(`splitPath(path=${path}): paths → ${paths}`);
logger.debug(`<<< Exiting splitPath(path=${path})`);
  return paths
}

export const splitRoutingPath = (routePath: string): string[] => {
logger.debug(`>>> Entering splitRoutingPath(routePath=${routePath})`);
  const { groups, path } = extractGroupsFromPath(routePath)

  const paths = splitPath(path)
logger.debug(`splitRoutingPath(routePath=${routePath}): paths → ${paths}`);
logger.debug(`<<< Exiting splitRoutingPath(routePath=${routePath})`);
  return replaceGroupMarks(paths, groups)
}

const extractGroupsFromPath = (path: string): { groups: [string, string][]; path: string } => {
  const groups: [string, string][] = []

  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`
    groups.push([mark, match])
    return mark
  })

logger.debug(`<<< Exiting extractGroupsFromPath(path=${path})`);
  return { groups, path }
}

const replaceGroupMarks = (paths: string[], groups: [string, string][]): string[] => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i]

    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1])
        break
      }
    }
  }

logger.debug(`<<< Exiting replaceGroupMarks(paths=${paths},groups=${groups})`);
  return paths
}

const patternCache: { [key: string]: Pattern } = {}
export const getPattern = (label: string, next?: string): Pattern | null => {
logger.debug(`>>> Entering getPattern(label=${label},next=${next})`);
  // *            => wildcard
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)

  if (label === '*') {
    return '*'
  }

  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
  if (match) {
logger.debug(`getPattern(label=${label},next=${next}): match → ${match}`);
    const cacheKey = `${label}#${next}`
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] =
          next && next[0] !== ':' && next[0] !== '*'
            ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)]
            : [label, match[1], new RegExp(`^${match[2]}$`)]
      } else {
        patternCache[cacheKey] = [label, match[1], true]
      }
    }

    return patternCache[cacheKey]
  }

logger.debug(`<<< Exiting getPattern(label=${label},next=${next})`);
  return null
}

type Decoder = (str: string) => string
export const tryDecode = (str: string, decoder: Decoder): string => {
logger.debug(`>>> Entering tryDecode(str=${str},decoder=${decoder})`);
  try {
    return decoder(str)
  } catch {
	logger.error(`Exception in tryDecode(str=${str},decoder=${decoder}): (no error binding)`);
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match)
      } catch {
        return match
      }
    })
  }
logger.debug(`<<< Exiting tryDecode(str=${str},decoder=${decoder})`);
}

/**
 * Try to apply decodeURI() to given string.
 * If it fails, skip invalid percent encoding or invalid UTF-8 sequences, and apply decodeURI() to the rest as much as possible.
 * @param str The string to decode.
 * @returns The decoded string that sometimes contains undecodable percent encoding.
 * @example
 * tryDecodeURI('Hello%20World') // 'Hello World'
 * tryDecodeURI('Hello%20World/%A4%A2') // 'Hello World/%A4%A2'
 */
export const tryDecodeURI = (str: string): string => tryDecode(str, decodeURI)

export const getPath = (request: Request): string => {
logger.debug(`>>> Entering getPath(request=${request})`);
  const url = request.url
  const start = url.indexOf('/', url.indexOf(':') + 4)
  let i = start
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i)
    if (charCode === 37) {
      // '%'
      // If the path contains percent encoding, use `indexOf()` to find '?' or '#' and return the result immediately.
      // Although this is a performance disadvantage, it is acceptable since we prefer cases that do not include percent encoding.
      const queryIndex = url.indexOf('?', i)
      const hashIndex = url.indexOf('#', i)
      const end =
        queryIndex === -1
          ? hashIndex === -1
            ? undefined
            : hashIndex
          : hashIndex === -1
            ? queryIndex
            : Math.min(queryIndex, hashIndex)
      const path = url.slice(start, end)
      return tryDecodeURI(path.includes('%25') ? path.replace(/%25/g, '%2525') : path)
    } else if (charCode === 63 || charCode === 35) {
	logger.debug(`getPath(request=${request}): path → ${path}`);
      // '?' or '#'
      break
    }
  }
logger.debug(`<<< Exiting getPath(request=${request})`);
  return url.slice(start, i)
}

export const getQueryStrings = (url: string): string => {
  const queryIndex = url.indexOf('?', 8)
logger.debug(`<<< Exiting getQueryStrings(url=${url})`);
  return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1)
}

export const getPathNoStrict = (request: Request): string => {
logger.debug(`>>> Entering getPathNoStrict(request=${request})`);
  const result = getPath(request)

logger.debug(`getPathNoStrict(request=${request}): result → ${result}`);
  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
logger.debug(`<<< Exiting getPathNoStrict(request=${request})`);
  return result.length > 1 && result.at(-1) === '/' ? result.slice(0, -1) : result
}

/**
 * Merge paths.
 * @param {string[]} ...paths - The paths to merge.
 * @returns {string} The merged path.
 * @example
 * mergePath('/api', '/users') // '/api/users'
 * mergePath('/api/', '/users') // '/api/users'
 * mergePath('/api', '/') // '/api'
 * mergePath('/api/', '/') // '/api/'
 */
export const mergePath: (...paths: string[]) => string = (
  base: string | undefined,
  sub: string | undefined,
  ...rest: string[]
): string => {
  if (rest.length) {
    sub = mergePath(sub as string, ...rest)
  }
  return `${base?.[0] === '/' ? '' : '/'}${base}${
    sub === '/' ? '' : `${base?.at(-1) === '/' ? '' : '/'}${sub?.[0] === '/' ? sub.slice(1) : sub}`
  }`
}

export const checkOptionalParameter = (path: string): string[] | null => {
  /*
    If path is `/api/animals/:type?` it will return:
    [`/api/animals`, `/api/animals/:type`]
    in other cases it will return null
  */

  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(':')) {
    return null
  }

  const segments = path.split('/')
  const results: string[] = []
  let basePath = ''

  segments.forEach((segment) => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === '') {
          results.push('/')
        } else {
          results.push(basePath)
        }
        const optionalSegment = segment.slice(0, -1)
        basePath += '/' + optionalSegment
        results.push(basePath)
      } else {
        basePath += '/' + segment
      }
    }
  })

logger.debug(`<<< Exiting checkOptionalParameter(path=${path})`);
  return results.filter((v, i, a) => a.indexOf(v) === i)
}

export const tryDecodeURIComponent = (str: string): string =>
  str.indexOf('%') !== -1 ? tryDecode(str, decodeURIComponent_) : str

// Optimized
const _decodeURI = (value: string): string => {
logger.debug(`>>> Entering _decodeURI(value=${value})`);
  if (value.indexOf('+') !== -1) {
    value = value.replace(/\+/g, ' ')
  }
logger.debug(`<<< Exiting _decodeURI(value=${value})`);
  return tryDecodeURIComponent(value)
}

const _getQueryParam = (
  url: string,
  key?: string,
  multiple?: boolean
): string | undefined | Record<string, string> | string[] | Record<string, string[]> => {
  let encoded

  if (!multiple && key && key.indexOf('%') === -1 && key.indexOf('+') === -1) {
    // optimized for unencoded key

    let keyIndex = url.indexOf('?', 8)
    if (keyIndex === -1) {
      return undefined
    }
    if (!url.startsWith(key, keyIndex + 1)) {
      keyIndex = url.indexOf(`&${key}`, keyIndex + 1)
    }
    while (keyIndex !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex + key.length + 1)
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex + key.length + 2
        const endIndex = url.indexOf('&', valueIndex)
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex))
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return ''
      }
      keyIndex = url.indexOf(`&${key}`, keyIndex + 1)
    }

    encoded = /[%+]/.test(url)
    if (!encoded) {
      return undefined
    }
    // fallback to default routine
  }

  const results: Record<string, string> | Record<string, string[]> = Object.create(null)
  encoded ??= /[%+]/.test(url)

  let keyIndex = url.indexOf('?', 8)
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf('&', keyIndex + 1)
    let valueIndex = url.indexOf('=', keyIndex)
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? (nextKeyIndex === -1 ? undefined : nextKeyIndex) : valueIndex
    )
    if (encoded) {
      name = _decodeURI(name)
    }

    keyIndex = nextKeyIndex

    if (name === '') {
      continue
    }

    let value
    if (valueIndex === -1) {
      value = ''
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex)
      if (encoded) {
        value = _decodeURI(value)
      }
    }

    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = []
      }
      ;(results[name] as string[]).push(value)
    } else {
      results[name] ??= value
    }
  }

logger.debug(`<<< Exiting _getQueryParam(url=${url},key=${key},multiple=${multiple})`);
  return key ? results[key] : results
}

export const getQueryParam: (
  url: string,
  key?: string
) => string | undefined | Record<string, string> = _getQueryParam as (
  url: string,
  key?: string
) => string | undefined | Record<string, string>

export const getQueryParams = (
  url: string,
  key?: string
): string[] | undefined | Record<string, string[]> => {
  return _getQueryParam(url, key, true) as string[] | undefined | Record<string, string[]>
}

// `decodeURIComponent` is a long name.
// By making it a function, we can use it commonly when minified, reducing the amount of code.
export const decodeURIComponent_ = decodeURIComponent
