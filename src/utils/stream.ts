const logger = console;
/**
 * @module
 * Stream utility.
 */

export class StreamingApi {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder: TextEncoder
  private writable: WritableStream
  private abortSubscribers: (() => void | Promise<void>)[] = []
  responseReadable: ReadableStream
  /**
   * Whether the stream has been aborted.
   */
  aborted: boolean = false
  /**
   * Whether the stream has been closed normally.
   */
  closed: boolean = false

  constructor(writable: WritableStream, _readable: ReadableStream) {
	logger.debug(`>>> Entering constructor(writable=${writable},_readable=${_readable})`);
    this.writable = writable
    this.writer = writable.getWriter()
    this.encoder = new TextEncoder()

	logger.debug(`constructor(writable=${writable},_readable=${_readable}): this.writable → ${this.writable}`);
    const reader = _readable.getReader()

	logger.debug(`constructor(writable=${writable},_readable=${_readable}): reader → ${reader}`);
    // in case the user disconnects, let the reader know to cancel
    // this in-turn results in responseReadable being closed
    // and writeSSE method no longer blocks indefinitely
    this.abortSubscribers.push(async () => {
      await reader.cancel()
    })

	logger.debug(`<<< Exiting constructor(writable=${writable},_readable=${_readable})`);
    this.responseReadable = new ReadableStream({
      async pull(controller) {
		logger.debug(`>>> Entering pull(controller=${controller})`);
        const { done, value } = await reader.read()
        done ? controller.close() : controller.enqueue(value)
		logger.debug(`<<< Exiting pull(controller=${controller})`);
      },
      cancel: () => {
        if (!this.closed) {
          this.abort()
        }
      },
    })
  }

  async write(input: Uint8Array | string): Promise<StreamingApi> {
    try {
      if (typeof input === 'string') {
		logger.debug(`>>> Entering write(input=${input})`);
		logger.error(`Exception in write(input=${input}): (no error binding)`);
		logger.debug(`<<< Exiting write(input=${input})`);
        input = this.encoder.encode(input)
      }
      await this.writer.write(input)
    } catch {
      // Do nothing. If you want to handle errors, create a stream by yourself.
    }
    return this
  }

  async writeln(input: string): Promise<StreamingApi> {
	logger.debug(`>>> Entering writeln(input=${input})`);
    await this.write(input + '\n')
	logger.debug(`<<< Exiting writeln(input=${input})`);
    return this
  }

  sleep(ms: number): Promise<unknown> {
	logger.debug(`>>> Entering sleep(ms=${ms})`);
	logger.debug(`<<< Exiting sleep(ms=${ms})`);
    return new Promise((res) => setTimeout(res, ms))
  }

  async close() {
	logger.debug('>>> Entering close()');
    this.closed = true
    try {
      await this.writer.close()
    } catch {
	logger.debug(`close(): this.closed → ${this.closed}`);
      // Do nothing. If you want to handle errors, create a stream by yourself.
    }
	logger.error('Exception in close()');
	logger.debug('<<< Exiting close()');
  }

  async pipe(body: ReadableStream) {
	logger.debug(`>>> Entering pipe(body=${body})`);
    this.writer.releaseLock()
    try {
      await body.pipeTo(this.writable, { preventClose: true, preventAbort: true })
    } finally {
      this.writer = this.writable.getWriter()
    }
	logger.debug(`<<< Exiting pipe(body=${body})`);
  }

  onAbort(listener: () => void | Promise<void>) {
    this.abortSubscribers.push(listener)
  }

  /**
   * Abort the stream.
   * You can call this method when stream is aborted by external event.
   */
  abort() {
	logger.debug('>>> Entering abort()');
    if (!this.aborted) {
      this.aborted = true
      this.abortSubscribers.forEach((subscriber) => subscriber())
    }
	logger.debug('<<< Exiting abort()');
  }
}
