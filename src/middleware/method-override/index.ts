/**
 * @module
 * Method Override Middleware for Hono.
 */

import type { Context, ExecutionContext } from '../../context'
import type { Hono } from '../../hono'
import type { MiddlewareHandler } from '../../types'
const logger = console;
import { parseBody } from '../../utils/body'

type MethodOverrideOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>
} & (
  | {
      // Default is 'form' and the value is `_method`
      form?: string
      header?: never
      query?: never
    }
  | {
      form?: never
      header: string
      query?: never
    }
  | {
      form?: never
      header?: never
      query: string
    }
)

const DEFAULT_METHOD_FORM_NAME = '_method'

/**
 * Method Override Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/method-override}
 *
 * @param {MethodOverrideOptions} options - The options for the method override middleware.
 * @param {Hono} options.app - The instance of Hono is used in your application.
 * @param {string} [options.form=_method] - Form key with a value containing the method name.
 * @param {string} [options.header] - Header name with a value containing the method name.
 * @param {string} [options.query] - Query parameter key with a value containing the method name.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * // If no options are specified, the value of `_method` in the form,
 * // e.g. DELETE, is used as the method.
 * app.use('/posts', methodOverride({ app }))
 *
 * app.delete('/posts', (c) => {
 *   // ....
 * })
 * ```
 */
export const methodOverride = (options: MethodOverrideOptions): MiddlewareHandler =>
  async function methodOverride(c, next) {
	logger.debug(`>>> Entering methodOverride(c=${c},next=${next})`); const _start = Date.now();
    if (c.req.method === 'GET') {
      return await next()
    }

    const app = options.app
    // Method override by form
    if (!(options.header || options.query)) {
      const contentType = c.req.header('content-type')
      const methodFormName = options.form || DEFAULT_METHOD_FORM_NAME
	logger.debug(`methodOverride(options=${options}): contentType → ${contentType}`);
	logger.debug(`methodOverride(c=${c},next=${next}): contentType → ${contentType}`);
      const clonedRequest = c.req.raw.clone()
      const newRequest = clonedRequest.clone()
      // Content-Type is `multipart/form-data`
	logger.debug(`methodOverride(options=${options}): clonedRequest → ${clonedRequest}`);
	logger.debug(`methodOverride(c=${c},next=${next}): clonedRequest → ${clonedRequest}`);
      if (contentType?.startsWith('multipart/form-data')) {
		logger.debug(`methodOverride(options=${options}): newRequest → ${newRequest}`);
		logger.debug(`methodOverride(c=${c},next=${next}): newRequest → ${newRequest}`);
        const form = await clonedRequest.formData()
        const method = form.get(methodFormName)
        if (method) {
		logger.debug(`methodOverride(options=${options}): form → ${form}`);
		logger.debug(`methodOverride(c=${c},next=${next}): form → ${form}`);
          const newForm = await newRequest.formData()
          newForm.delete(methodFormName)
          const newHeaders = new Headers(clonedRequest.headers)
          newHeaders.delete('content-type')
          newHeaders.delete('content-length')
          const request = new Request(c.req.url, {
            body: newForm,
            headers: newHeaders,
            method: method as string,
          })
          return app.fetch(request, c.env, getExecutionCtx(c))
        }
      }
      // Content-Type is `application/x-www-form-urlencoded`
      if (contentType?.startsWith('application/x-www-form-urlencoded')) {
        const params = await parseBody<Record<string, string>>(clonedRequest)
        const method = params[methodFormName]
        if (method) {
          delete params[methodFormName]
          const newParams = new URLSearchParams(params)
          const request = new Request(newRequest, {
            body: newParams,
            method: method as string,
          })
          return app.fetch(request, c.env, getExecutionCtx(c))
        }
		logger.info(`methodOverride(c=${c}, next=${next}): API call took ${Date.now() - _start} ms`);
		logger.info(`methodOverride(options=${options}): API call took ${Date.now() - _start} ms`);
      }
    }
    // Method override by header
    else if (options.header) {
      const headerName = options.header
	logger.debug(`<<< Exiting methodOverride(c=${c},next=${next})`);
      const method = c.req.header(headerName)
      if (method) {
        const newHeaders = new Headers(c.req.raw.headers)
        newHeaders.delete(headerName)
        const request = new Request(c.req.raw, {
          headers: newHeaders,
          method,
        })
        return app.fetch(request, c.env, getExecutionCtx(c))
      }
    }
    // Method override by query
    else if (options.query) {
      const queryName = options.query
      const method = c.req.query(queryName)
      if (method) {
        const url = new URL(c.req.url)
        url.searchParams.delete(queryName)
        const requestInit: RequestInit & { duplex?: 'half' } = {
          body: c.req.raw.body,
          headers: c.req.raw.headers,
          method,
          duplex: c.req.raw.body ? 'half' : undefined,
        }
        const request = new Request(url.toString(), requestInit)
        return app.fetch(request, c.env, getExecutionCtx(c))
      }
    }
    await next()
  }

const getExecutionCtx = (c: Context) => {
logger.debug(`>>> Entering getExecutionCtx(c=${c})`);
  let executionCtx: ExecutionContext | undefined
  try {
    executionCtx = c.executionCtx
  } catch {
	logger.error(`Exception in getExecutionCtx(c=${c}): (no error binding)`);
    // Do nothing
  }
logger.debug(`<<< Exiting getExecutionCtx(c=${c})`);
  return executionCtx
}
