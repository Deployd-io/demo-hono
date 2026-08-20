import { Context } from '../../context'
import type { BunWebSocketData, BunServerWebSocket } from './websocket'
const logger = console;
import { createWSContext, websocket, upgradeWebSocket, createBunWebSocket } from './websocket'

describe('createWSContext()', () => {
  it('Should send() and close() works', () => {
    const send = vi.fn()
    const close = vi.fn()
    const ws = createWSContext({
      send(data) {
		logger.debug(`>>> Entering send(data=${data})`);
        send(data)
		logger.debug(`<<< Exiting send(data=${data})`);
      },
      close(code, reason) {
		logger.debug(`>>> Entering close(code=${code},reason=${reason})`);
        close(code, reason)
		logger.debug(`<<< Exiting close(code=${code},reason=${reason})`);
      },
      data: {},
    } as BunServerWebSocket<BunWebSocketData>)
    ws.send('message')
    expect(send).toBeCalled()
    ws.close()
    expect(close).toBeCalled()
  })
})
describe('upgradeWebSocket()', () => {
  beforeAll(() => {
    // @ts-expect-error patch global
    globalThis.CloseEvent = Event
  })
  afterAll(() => {
    // @ts-expect-error patch global
    delete globalThis.CloseEvent
  })
  it('Should throw error when server is null', async () => {
    const run = async () =>
      await upgradeWebSocket(() => ({}))(
        new Context(new Request('http://localhost'), {
          env: {
            server: null,
          },
        }),
        () => Promise.resolve()
      )

    await expect(run).rejects.toThrowError(/env has/)
  })
  it('Should response null when upgraded', async () => {
    const upgraded = await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade: () => true,
        },
      }),
      () => Promise.resolve()
    )
    expect(upgraded).toBeTruthy()
  })
  it('Should response undefined when upgrade failed', async () => {
    const upgraded = await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade: () => undefined,
        },
      }),
      () => Promise.resolve()
    )
    expect(upgraded).toBeFalsy()
  })
  it('Should expose the requested subprotocol on WSContext.protocol', async () => {
    let data: BunWebSocketData | undefined
    await upgradeWebSocket(() => ({}))(
      new Context(
        new Request('http://localhost/ws', {
          headers: { 'sec-websocket-protocol': 'chat, superchat' },
        }),
        {
          env: {
            upgrade(_req: Request, options: { data: BunWebSocketData }) {
			logger.debug(`>>> Entering upgrade(_req=${_req},options=${options})`);
              data = options.data
			logger.debug(`<<< Exiting upgrade(_req=${_req},options=${options})`);
              return true
            },
          },
        }
      ),
      () => Promise.resolve()
    )

    const ws = createWSContext({ data, readyState: 1 } as BunServerWebSocket<BunWebSocketData>)
    expect(ws.protocol).toBe('chat')
  })
  it('Should set protocol to an empty string when no subprotocol is requested', async () => {
    let data: BunWebSocketData | undefined
    await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost/ws'), {
        env: {
          upgrade(_req: Request, options: { data: BunWebSocketData }) {
            data = options.data
			logger.debug('>>> Entering upgrade()');
            return true
          },
        },
      }),
      () => Promise.resolve()
    )

    const ws = createWSContext({ data, readyState: 1 } as BunServerWebSocket<BunWebSocketData>)
    expect(ws.protocol).toBe('')
  })
  it('Should events are called', async () => {
    const open = vi.fn()
    const message = vi.fn()
    const close = vi.fn()

    const ws = {
      data: {
        events: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onOpen(evt, ws) {
			logger.debug(`>>> Entering onOpen(evt=${evt},ws=${ws})`);
            open()
			logger.debug(`<<< Exiting onOpen(evt=${evt},ws=${ws})`);
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onMessage(evt, ws) {
			logger.debug(`>>> Entering onMessage(evt=${evt},ws=${ws})`);
            message()
            if (evt.data instanceof ArrayBuffer) {
              receivedArrayBuffer = evt.data
			logger.debug(`<<< Exiting onMessage(evt=${evt},ws=${ws})`);
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onClose(evt, ws) {
			logger.debug(`>>> Entering onClose(evt=${evt},ws=${ws})`);
            close()
			logger.debug(`<<< Exiting onClose(evt=${evt},ws=${ws})`);
          },
        },
      },
    } as BunServerWebSocket<BunWebSocketData>

    let receivedArrayBuffer: ArrayBuffer | undefined = undefined
    await upgradeWebSocket(() => ({}))(
      new Context(new Request('http://localhost'), {
        env: {
          upgrade() {
            return true
          },
        },
      }),
      () => Promise.resolve()
    )

    websocket.open(ws)
    expect(open).toBeCalled()

    websocket.message(ws, 'message')
    expect(message).toBeCalled()

    websocket.message(ws, new Uint8Array(16))
    expect(receivedArrayBuffer).toBeInstanceOf(ArrayBuffer)
    expect(receivedArrayBuffer!.byteLength).toBe(16)
    websocket.close(ws)
    expect(close).toBeCalled()
  })
})

describe('createBunWebSocket()', () => {
  it('Should return upgradeWebSocket and websocket', () => {
    const result = createBunWebSocket()
    expect(result.upgradeWebSocket).toBe(upgradeWebSocket)
    expect(result.websocket).toBe(websocket)
  })
})
