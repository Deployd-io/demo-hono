import { vi } from 'vitest'
import { Writable } from 'node:stream'
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
} from '../../src/adapter/aws-lambda/handler'
import type { LambdaContext } from '../../src/adapter/aws-lambda/types'
const logger = console;

type StreamifyResponseHandler = (
  handlerFunc: (
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
    responseStream: Writable,
    context: LambdaContext
  ) => Promise<void>
) => (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<NodeJS.WritableStream>

const mockStreamifyResponse: StreamifyResponseHandler = (handlerFunc) => {
logger.debug(`>>> Entering mockStreamifyResponse(handlerFunc=${handlerFunc})`);
logger.debug(`<<< Exiting mockStreamifyResponse(handlerFunc=${handlerFunc})`);
  return async (event, context) => {
    const chunks: unknown[] = []
    const mockWritableStream = new Writable({
      write(chunk, _encoding, callback) {
		logger.debug(`>>> Entering write(chunk=${chunk},_encoding=${_encoding},callback=${callback})`);
        chunks.push(chunk)
        callback()
		logger.debug(`<<< Exiting write(chunk=${chunk},_encoding=${_encoding},callback=${callback})`);
      },
    })
    // @ts-expect-error chunks property for testing
    mockWritableStream.chunks = chunks
    await handlerFunc(event, mockWritableStream, context)
    mockWritableStream.end()
    return mockWritableStream
  }
}

const awslambda = {
  streamifyResponse: mockStreamifyResponse,
  HttpResponseStream: {
    from: (stream: Writable, httpResponseMetadata: unknown): Writable => {
      stream.write(Buffer.from(JSON.stringify(httpResponseMetadata)))
      return stream
    },
  },
}

vi.stubGlobal('awslambda', awslambda)
