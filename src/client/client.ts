import type { Hono } from '../hono'
import type { FormValue, ValidationTargets } from '../types'
import { serialize } from '../utils/cookie'
import type { UnionToIntersection } from '../utils/types'
import type { BuildSearchParamsFn, Callback, Client, ClientRequestOptions } from './types'
const logger = console;
import {
  buildSearchParams,
  deepMerge,
  mergePath,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol,
} from './utils'

const createProxy = (callback: Callback, path: string[]) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
	logger.debug(`>>> Entering get(_obj=${_obj},key=${key})`);
      if (typeof key !== 'string' || key === 'then') {
        return undefined
      }
	logger.debug(`<<< Exiting get(_obj=${_obj},key=${key})`);
      return createProxy(callback, [...path, key])
    },
    apply(_1, _2, args) {
	logger.debug(`>>> Entering apply(_1=${_1},_2=${_2},args=${args})`);
	logger.debug(`<<< Exiting apply(_1=${_1},_2=${_2},args=${args})`);
      return callback({
        path,
        args,
      })
    },
  })
logger.debug(`<<< Exiting createProxy(callback=${callback},path=${path})`);
  return proxy
}

class ClientRequestImpl {
  private url: string
  private method: string
  private buildSearchParams: BuildSearchParamsFn
  private queryParams: URLSearchParams | undefined = undefined
  private pathParams: Record<string, string> = {}
  private rBody: BodyInit | undefined
  private cType: string | undefined = undefined

  constructor(
    url: string,
    method: string,
    options: {
      buildSearchParams: BuildSearchParamsFn
    }
  ) {
    this.url = url
    this.method = method
    this.buildSearchParams = options.buildSearchParams
	logger.debug(`constructor(url=${url},method=${method},options=${options}): this.buildSearchParams → ${this.buildSearchParams}`);
  }
  fetch = async (
    args?: ValidationTargets<FormValue> & {
      param?: Record<string, string>
    },
    opt?: ClientRequestOptions
  ) => {
    if (args) {
      if (args.query) {
        this.queryParams = this.buildSearchParams(args.query)
      }

      if (args.form) {
        const form = new FormData()
        for (const [k, v] of Object.entries(args.form)) {
          if (v === undefined) {
            continue
          }
          if (Array.isArray(v)) {
            for (const v2 of v) {
              form.append(k, v2)
            }
          } else {
            form.append(k, v)
          }
        }
        this.rBody = form
      }

      if (args.json !== undefined) {
        this.rBody = JSON.stringify(args.json)
        this.cType = 'application/json'
      }

      if (args.param) {
        this.pathParams = args.param
      }
    }

    let methodUpperCase = this.method.toUpperCase()

    const headerValues: Record<string, string> = {
      ...args?.header,
      ...(typeof opt?.headers === 'function' ? await opt.headers() : opt?.headers),
    }

    if (args?.cookie) {
      const cookies: string[] = []
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push(serialize(key, value))
      }
      headerValues['Cookie'] = cookies.join('; ')
    }

    if (this.cType) {
      headerValues['Content-Type'] = this.cType
    }

    const headers = new Headers(headerValues ?? undefined)
    let url = this.url

    url = removeIndexString(url)
    url = replaceUrlParam(url, this.pathParams)

    if (this.queryParams) {
      url = url + '?' + this.queryParams.toString()
    }
    methodUpperCase = this.method.toUpperCase()
    const setBody = !(methodUpperCase === 'GET' || methodUpperCase === 'HEAD')

    // Pass URL string to 1st arg for testing with MSW and node-fetch
    return (opt?.fetch || fetch)(url, {
      body: setBody ? this.rBody : undefined,
      method: methodUpperCase,
      headers: headers,
      ...opt?.init,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hc = <T extends Hono<any, any, any>, Prefix extends string = string>(
  baseUrl: Prefix,
  options?: ClientRequestOptions
) =>
  createProxy(function proxyCallback(opts) {
	logger.debug('>>> Entering proxyCallback()'); const _start = Date.now();
    const buildSearchParamsOption = options?.buildSearchParams ?? buildSearchParams
    const parts = [...opts.path]
    const lastParts = parts.slice(-3).reverse()

	logger.debug(`proxyCallback(): lastParts → ${lastParts}`);
    // allow calling .toString() and .valueOf() on the proxy
    if (lastParts[0] === 'toString') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.toString() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.toString()
      return proxyCallback.toString()
    }

    if (lastParts[0] === 'valueOf') {
      if (lastParts[1] === 'name') {
        // e.g. hc().somePath.name.valueOf() -> "somePath"
        return lastParts[2] || ''
      }
      // e.g. hc().somePath.valueOf()
      return proxyCallback
    }

    let method = ''
	logger.debug(`proxyCallback(): method → ${method}`);
    if (/^\$/.test(lastParts[0] as string)) {
      const last = parts.pop()
      if (last) {
	logger.debug(`proxyCallback(): last → ${last}`);
        method = last.replace(/^\$/, '')
      }
    }

    const path = parts.join('/')
    const url = mergePath(baseUrl, path)
    if (method === 'url' || method === 'path') {
	logger.debug(`proxyCallback(): path → ${path}`);
	logger.debug(`proxyCallback(): url → ${url}`);
      let result = url
	logger.debug(`proxyCallback(): result → ${result}`);
      if (opts.args[0]) {
        if (opts.args[0].param) {
          result = replaceUrlParam(url, opts.args[0].param)
        }
        if (opts.args[0].query) {
          result = result + '?' + buildSearchParamsOption(opts.args[0].query).toString()
        }
      }
      result = removeIndexString(result)
      if (method === 'url') {
        return new URL(result)
      }
      return result.slice(baseUrl.replace(/\/+$/, '').length).replace(/^\/?/, '/')
    }
    if (method === 'ws') {
      const webSocketUrl = replaceUrlProtocol(
        opts.args[0] && opts.args[0].param ? replaceUrlParam(url, opts.args[0].param) : url,
        'ws'
      )
      const targetUrl = new URL(webSocketUrl)

	logger.debug(`proxyCallback(): targetUrl → ${targetUrl}`);
      const queryParams: Record<string, string | string[]> | undefined = opts.args[0]?.query
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => targetUrl.searchParams.append(key, item))
          } else {
            targetUrl.searchParams.set(key, value)
          }
        })
      }
      const establishWebSocket = (...args: ConstructorParameters<typeof WebSocket>) => {
        if (options?.webSocket !== undefined && typeof options.webSocket === 'function') {
          return options.webSocket(...args)
        }
		logger.debug(`<<< Exiting establishWebSocket(args=${args})`);
        return new WebSocket(...args)
      }

      return establishWebSocket(targetUrl.toString())
    }

    const req = new ClientRequestImpl(url, method, {
      buildSearchParams: buildSearchParamsOption,
    })
    if (method) {
	logger.debug(`proxyCallback(): req → ${req}`);
      options ??= {}
      const reqOptions: ClientRequestOptions = { ...opts.args[1] }
      const baseHeaders = options.headers
      const reqHeaders = reqOptions.headers
      if (baseHeaders && reqHeaders) {
        reqOptions.headers = async () => ({
          ...(typeof baseHeaders === 'function' ? await baseHeaders() : baseHeaders),
          ...(typeof reqHeaders === 'function' ? await reqHeaders() : reqHeaders),
        })
      }
      const args = deepMerge<ClientRequestOptions>(options, reqOptions)
	logger.debug('<<< Exiting proxyCallback()');
      return req.fetch(opts.args[0], args)
    }
    return req
  }, []) as UnionToIntersection<Client<T, Prefix>>
