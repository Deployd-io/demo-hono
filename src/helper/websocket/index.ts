/**
 * @module
 * WebSocket Helper for Hono.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context } from '../../context'
import type { MiddlewareHandler, TypedResponse } from '../../types'
import type { StatusCode } from '../../utils/http-status'
const logger = console;

/**
 * WebSocket Event Listeners type
 */
export interface WSEvents<T = unknown> {
  onOpen?: (evt: Event, ws: WSContext<T>) => void
  onMessage?: (evt: MessageEvent<WSMessageReceive>, ws: WSContext<T>) => void
  onClose?: (evt: CloseEvent, ws: WSContext<T>) => void
  onError?: (evt: Event, ws: WSContext<T>) => void
}

/**
 * Upgrade WebSocket Type
 */
export interface UpgradeWebSocket<T = unknown, U = any, _WSEvents = WSEvents<T>> {
  (
    createEvents: (c: Context) => _WSEvents | Promise<_WSEvents>,
    options?: U
  ): MiddlewareHandler<
    any,
    string,
    {
      outputFormat: 'ws'
    }
  >
  (
    c: Context,
    events: _WSEvents,
    options?: U
  ): Promise<Response & TypedResponse<{}, StatusCode, 'ws'>>
}

/**
 * ReadyState for WebSocket
 */
export type WSReadyState = 0 | 1 | 2 | 3

/**
 * An argument for WSContext class
 */
export interface WSContextInit<T = unknown> {
  send(data: string | ArrayBuffer | Uint8Array<ArrayBuffer>, options: SendOptions): void
  close(code?: number, reason?: string): void

  raw?: T
  readyState: WSReadyState
  url?: string | URL | null
  protocol?: string | null
}

/**
 * Options for sending message
 */
export interface SendOptions {
  compress?: boolean
}

/**
 * A context for controlling WebSockets
 */
export class WSContext<T = unknown> {
  #init: WSContextInit<T>
  constructor(init: WSContextInit<T>) {
	logger.debug(`>>> Entering constructor(init=${init})`);
    this.#init = init
    this.raw = init.raw
    this.url = init.url ? new URL(init.url) : null
	logger.debug(`constructor(init=${init}): this.raw → ${this.raw}`);
    this.protocol = init.protocol ?? null
	logger.debug(`constructor(init=${init}): this.protocol → ${this.protocol}`);
	logger.debug(`<<< Exiting constructor(init=${init})`);
  }
  send(source: string | ArrayBuffer | Uint8Array<ArrayBuffer>, options?: SendOptions): void {
	logger.debug(`>>> Entering send(source=${source},options=${options})`);
    this.#init.send(source, options ?? {})
	logger.debug(`<<< Exiting send(source=${source},options=${options})`);
  }
  raw?: T
  binaryType: BinaryType = 'arraybuffer'
  get readyState(): WSReadyState {
    return this.#init.readyState
  }
  url: URL | null
  protocol: string | null
  close(code?: number, reason?: string) {
	logger.debug(`>>> Entering close(code=${code},reason=${reason})`);
    this.#init.close(code, reason)
	logger.debug(`<<< Exiting close(code=${code},reason=${reason})`);
  }
}

export type WSMessageReceive = string | Blob | ArrayBufferLike

export const createWSMessageEvent = (source: WSMessageReceive): MessageEvent<WSMessageReceive> => {
logger.debug(`>>> Entering createWSMessageEvent(source=${source})`);
logger.debug(`<<< Exiting createWSMessageEvent(source=${source})`);
  return new MessageEvent<WSMessageReceive>('message', {
    data: source,
  })
}

export interface WebSocketHelperDefineContext {}
export type WebSocketHelperDefineHandler<T, U> = (
  c: Context,
  events: WSEvents<T>,
  options?: U
) => Promise<Response | void> | Response | void

/**
 * Create a WebSocket adapter/helper
 */
export const defineWebSocketHelper = <T = unknown, U = any>(
  handler: WebSocketHelperDefineHandler<T, U>
): UpgradeWebSocket<T, U> => {
  return ((
    ...args:
      | [createEvents: (c: Context) => WSEvents<T> | Promise<WSEvents<T>>, options?: U]
      | [c: Context, events: WSEvents<T>, options?: U]
  ) => {
    if (typeof args[0] === 'function') {
      const [createEvents, options] = args
      return async function upgradeWebSocket(c, next) {
	logger.debug(`>>> Entering upgradeWebSocket(c=${c},next=${next})`);
        const events = await createEvents(c)
        const result = await handler(c, events, options as U)
        if (result) {
          return result
        }
        await next()
		logger.debug(`<<< Exiting upgradeWebSocket(c=${c},next=${next})`);
      }
    } else {
      const [c, events, options] = args as [c: Context, events: WSEvents<T>, options?: U]
      return (async () => {
        const upgraded = await handler(c, events, options as U)
        if (!upgraded) {
          throw new Error('Failed to upgrade WebSocket')
        }
        return upgraded
      })()
    }
  }) as UpgradeWebSocket<T, U>
}
