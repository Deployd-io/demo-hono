const logger = console;
import { stream, streamSSE } from '../../helper/streaming'
import { Hono } from '../../hono'
import { compress } from '.'

describe('Compress Middleware', () => {
  const app = new Hono()

  // Apply compress middleware to all routes
  app.use('*', compress())

  // Test routes
  app.get('/small', (c) => {
	logger.debug(`>>> Entering GET_small(c=${c})`);
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '5')
	logger.debug(`<<< Exiting GET_small(c=${c})`);
    return c.text('small')
  })
  app.get('/large', (c) => {
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    return c.text('a'.repeat(1024))
  })
  app.get('/small-json', (c) => {
	logger.debug(`<<< Exiting GET_large(c=${c})`);
    c.header('Content-Type', 'application/json')
    c.header('Content-Length', '26')
    return c.json({ message: 'Hello, World!' })
  })
  app.get('/large-json', (c) => {
	logger.debug(`<<< Exiting GET_small_json(c=${c})`);
    c.header('Content-Type', 'application/json')
    c.header('Content-Length', '1024')
    return c.json({ data: 'a'.repeat(1024), message: 'Large JSON' })
  })
  app.get('/no-transform', (c) => {
	logger.debug(`<<< Exiting GET_large_json(c=${c})`);
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    c.header('Cache-Control', 'no-transform')
    return c.text('a'.repeat(1024))
  })
  app.get('/jpeg-image', (c) => {
	logger.debug(`<<< Exiting GET_no_transform(c=${c})`);
    c.header('Content-Type', 'image/jpeg')
    c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_jpeg_image(c=${c})`);
    return c.body(new Uint8Array(1024)) // Simulated JPEG data
  })
  app.get('/already-compressed', (c) => {
	logger.debug(`>>> Entering GET_already_compressed(c=${c})`);
    c.header('Content-Type', 'application/octet-stream')
    c.header('Content-Encoding', 'br')
    c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_already_compressed(c=${c})`);
    return c.body(new Uint8Array(1024)) // Simulated compressed data
  })
  app.get('/transfer-encoding-deflate', (c) => {
	logger.debug(`>>> Entering GET_transfer_encoding_deflate(c=${c})`);
    c.header('Content-Type', 'application/octet-stream')
    c.header('Transfer-Encoding', 'deflate')
    c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_transfer_encoding_deflate(c=${c})`);
    return c.body(new Uint8Array(1024)) // Simulated deflate data
  })
  app.get('/chunked', (c) => {
	logger.debug(`>>> Entering GET_chunked(c=${c})`);
    c.header('Content-Type', 'application/octet-stream')
    c.header('Transfer-Encoding', 'chunked')
    c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_chunked(c=${c})`);
    return c.body(new Uint8Array(1024)) // Simulated chunked data
  })
  app.get('/partial', (c) => {
	logger.debug(`>>> Entering GET_partial(c=${c})`);
    c.header('Content-Type', 'text/plain')
    c.header('Content-Length', '1024')
    c.header('Content-Range', 'bytes 0-1023/2048')
	logger.debug(`<<< Exiting GET_partial(c=${c})`);
    return c.body('a'.repeat(1024), 206)
  })
  app.get('/stream', (c) =>
    stream(c, async (stream) => {
      c.header('Content-Type', 'text/plain')
      // 60000 bytes
      for (let i = 0; i < 10000; i++) {
        await stream.write('chunk ')
      }
    })
  )
  app.get('/already-compressed-stream', (c) =>
    stream(c, async (stream) => {
      c.header('Content-Type', 'text/plain')
      c.header('Content-Encoding', 'br')
      // 60000 bytes
      for (let i = 0; i < 10000; i++) {
        await stream.write(new Uint8Array([0, 1, 2, 3, 4, 5])) // Simulated compressed data
      }
    })
  )
  app.get('/sse', (c) =>
    streamSSE(c, async (stream) => {
      for (let i = 0; i < 1000; i++) {
        await stream.writeSSE({ data: 'chunk' })
      }
    })
  )
  app.notFound((c) => c.text('Custom NotFound', 404))

  const testCompression = async (
    path: string,
    acceptEncoding: string,
    expectedEncoding: string | null
  ) => {
	logger.debug(`>>> Entering testCompression(path=${path},acceptEncoding=${acceptEncoding},expectedEncoding=${expectedEncoding})`);
	const _start = Date.now();
    const req = new Request(`http://localhost${path}`, {
      method: 'GET',
      headers: new Headers({ 'Accept-Encoding': acceptEncoding }),
    })
    const res = await app.request(req)
    expect(res.headers.get('Content-Encoding')).toBe(expectedEncoding)
    return res
	logger.info(`testCompression(path=${path}, acceptEncoding=${acceptEncoding}, expectedEncoding=${expectedEncoding}): API call took ${Date.now() - _start} ms`);
	logger.debug(`<<< Exiting testCompression(path=${path},acceptEncoding=${acceptEncoding},expectedEncoding=${expectedEncoding})`);
  }

  describe('Compression Behavior', () => {
    it('should compress large responses with gzip', async () => {
      const res = await testCompression('/large', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024)
    })

    it('should compress large responses with deflate', async () => {
      const res = await testCompression('/large', 'deflate', 'deflate')
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024)
    })

    it('should prioritize gzip over deflate when both are accepted', async () => {
      await testCompression('/large', 'gzip, deflate', 'gzip')
    })

    it('should not compress small responses', async () => {
      const res = await testCompression('/small', 'gzip, deflate', null)
      expect(res.headers.get('Content-Length')).toBe('5')
    })

    it('should not compress when no Accept-Encoding is provided', async () => {
      await testCompression('/large', '', null)
    })

    it('should not compress images', async () => {
      const res = await testCompression('/jpeg-image', 'gzip', null)
      expect(res.headers.get('Content-Type')).toBe('image/jpeg')
      expect(res.headers.get('Content-Length')).toBe('1024')
    })

    it('should not compress already compressed responses', async () => {
      const res = await testCompression('/already-compressed', 'gzip', 'br')
      expect(res.headers.get('Content-Length')).toBe('1024')
    })

    it('should remove Content-Length when compressing', async () => {
      const res = await testCompression('/large', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
    })

    it('should not remove Content-Length when not compressing', async () => {
      const res = await testCompression('/jpeg-image', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBeDefined()
    })

    it('should not compress transfer-encoding: deflate', async () => {
      const res = await testCompression('/transfer-encoding-deflate', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Transfer-Encoding')).toBe('deflate')
    })

    it('should not compress transfer-encoding: chunked', async () => {
      const res = await testCompression('/chunked', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Transfer-Encoding')).toBe('chunked')
    })

    it('should not compress 206 Partial Content responses', async () => {
      const res = await testCompression('/partial', 'gzip', null)
      expect(res.status).toBe(206)
      expect(res.headers.get('Content-Length')).toBe('1024')
      expect(res.headers.get('Content-Range')).toBe('bytes 0-1023/2048')
      expect(await res.text()).toBe('a'.repeat(1024))
    })
  })

  describe('JSON Handling', () => {
    it('should not compress small JSON responses', async () => {
      const res = await testCompression('/small-json', 'gzip', null)
      expect(res.headers.get('Content-Length')).toBe('26')
    })

    it('should compress large JSON responses', async () => {
      const res = await testCompression('/large-json', 'gzip', 'gzip')
      expect(res.headers.get('Content-Length')).toBeNull()
      const decompressed = await decompressResponse(res)
      const json = JSON.parse(decompressed)
      expect(json.data.length).toBe(1024)
      expect(json.message).toBe('Large JSON')
    })
  })

  describe('Streaming Responses', () => {
    it('should compress streaming responses written in multiple chunks', async () => {
      const res = await testCompression('/stream', 'gzip', 'gzip')
      const decompressed = await decompressResponse(res)
      expect(decompressed.length).toBe(60000)
    })

    it('should not compress already compressed streaming responses', async () => {
      const res = await testCompression('/already-compressed-stream', 'gzip', 'br')
      expect((await res.arrayBuffer()).byteLength).toBe(60000)
    })

    it('should not compress server-sent events', async () => {
      const res = await testCompression('/sse', 'gzip', null)
      expect((await res.arrayBuffer()).byteLength).toBe(13000)
    })
  })

  describe('ETag Handling', () => {
    const app = new Hono()
    app.use('*', compress())
    app.get('/strong-etag', (c) => {
	logger.debug(`>>> Entering GET_strong_etag(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('ETag', '"strong-etag"')
      return c.text('a'.repeat(1024))
    })
    app.get('/weak-etag', (c) => {
	logger.debug(`<<< Exiting GET_strong_etag(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('ETag', 'W/"weak-etag"')
      return c.text('a'.repeat(1024))
    })
    app.get('/no-etag', (c) => {
	logger.debug(`<<< Exiting GET_weak_etag(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_no_etag(c=${c})`);
      return c.text('a'.repeat(1024))
    })

    it('should convert strong ETag to weak ETag when compressing', async () => {
      const res = await app.request('/strong-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBe('W/"strong-etag"')
    })

    it('should keep strong ETag when not compressing', async () => {
      const res = await app.request('/strong-etag')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('ETag')).toBe('"strong-etag"')
    })

    it('should not modify weak ETag when compressing', async () => {
      const res = await app.request('/weak-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBe('W/"weak-etag"')
    })

    it('should not add ETag when none exists', async () => {
      const res = await app.request('/no-etag', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('ETag')).toBeNull()
    })
  })

  describe('Vary Header', () => {
    const app = new Hono()
    app.use('*', compress())
    app.get('/no-vary', (c) => {
	logger.debug(`>>> Entering GET_no_vary(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      return c.text('a'.repeat(1024))
    })
    app.get('/existing-vary', (c) => {
	logger.debug(`<<< Exiting GET_no_vary(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', 'Cookie')
      return c.text('a'.repeat(1024))
    })
    app.get('/already-accept-encoding', (c) => {
	logger.debug(`<<< Exiting GET_existing_vary(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', 'Accept-Encoding')
      return c.text('a'.repeat(1024))
    })
    app.get('/wildcard-vary', (c) => {
	logger.debug(`<<< Exiting GET_already_accept_encoding(c=${c})`);
      c.header('Content-Type', 'text/plain')
      c.header('Content-Length', '1024')
      c.header('Vary', '*')
      return c.text('a'.repeat(1024))
    })
    app.get('/not-compressible', (c) => {
	logger.debug(`<<< Exiting GET_wildcard_vary(c=${c})`);
      c.header('Content-Type', 'image/png')
      c.header('Content-Length', '1024')
	logger.debug(`<<< Exiting GET_not_compressible(c=${c})`);
      return c.body('a'.repeat(1024))
    })

    it('should set Vary: Accept-Encoding when compressing', async () => {
      const res = await app.request('/no-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should append Accept-Encoding to an existing Vary header', async () => {
      const res = await app.request('/existing-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Cookie, Accept-Encoding')
    })

    it('should not duplicate Accept-Encoding when Vary already lists it', async () => {
      const res = await app.request('/already-accept-encoding', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should leave Vary: * unchanged', async () => {
      const res = await app.request('/wildcard-vary', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
      expect(res.headers.get('Vary')).toBe('*')
    })

    it('should set Vary on an identity response when Accept-Encoding is absent', async () => {
      const res = await app.request('/no-vary')
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should set Vary on an identity response when no offered encoding is accepted', async () => {
      const res = await app.request('/no-vary', {
        headers: { 'Accept-Encoding': 'br' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBe('Accept-Encoding')
    })

    it('should not add a Vary header when the response is not eligible for compression', async () => {
      const res = await app.request('/not-compressible', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
      expect(res.headers.get('Vary')).toBeNull()
    })
  })

  describe('contentTypeFilter', () => {
    describe('RegExp', () => {
      const app = new Hono()
      app.use('*', compress({ contentTypeFilter: /^application\/json/, threshold: 0 }))
      app.get('/json', (c) => c.json({ data: 'a'.repeat(1024) }))
      app.get('/text', (c) => c.text('a'.repeat(1024)))

      it('should compress when Content-Type matches', async () => {
        const res = await app.request('/json', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBe('gzip')
      })

      it('should not compress when Content-Type does not match', async () => {
        const res = await app.request('/text', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBeNull()
      })
    })

    describe('function', () => {
      const app = new Hono()
      app.use('*', compress({ contentTypeFilter: (type) => type.includes('json'), threshold: 0 }))
      app.get('/json', (c) => c.json({ data: 'a'.repeat(1024) }))
      app.get('/text', (c) => c.text('a'.repeat(1024)))

      it('should compress when Content-Type matches', async () => {
        const res = await app.request('/json', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBe('gzip')
      })

      it('should not compress when Content-Type does not match', async () => {
        const res = await app.request('/text', {
          headers: { 'Accept-Encoding': 'gzip' },
        })
        expect(res.headers.get('Content-Encoding')).toBeNull()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should not compress responses with Cache-Control: no-transform', async () => {
      await testCompression('/no-transform', 'gzip', null)
    })

    it('should handle HEAD requests without compression', async () => {
      const req = new Request('http://localhost/large', {
        method: 'HEAD',
        headers: new Headers({ 'Accept-Encoding': 'gzip' }),
      })
      const res = await app.request(req)
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should compress custom 404 Not Found responses', async () => {
      const res = await testCompression('/not-found', 'gzip', 'gzip')
      expect(res.status).toBe(404)
      const decompressed = await decompressResponse(res)
      expect(decompressed).toBe('Custom NotFound')
    })
  })

  describe('Encoding Option', () => {
    const buildApp = (encoding: 'gzip' | 'deflate') => {
	logger.debug(`>>> Entering buildApp(encoding=${encoding})`);
      const app = new Hono()
      app.use('*', compress({ encoding }))
      app.get('/large', (c) => {
	logger.debug(`buildApp(encoding=${encoding}): app → ${app}`);
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
	logger.debug(`<<< Exiting buildApp(encoding=${encoding})`);
      return app
    }

    it('should compress when configured encoding is accepted by the client', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should not compress when configured encoding is not in Accept-Encoding', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'deflate' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should not compress when Accept-Encoding header is absent', async () => {
      const app = buildApp('gzip')
      const res = await app.request('/large')
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })
  })

  describe('Accept-Encoding parsing', () => {
    const buildAppDefault = () => {
	logger.debug('>>> Entering buildAppDefault()');
      const app = new Hono()
      app.use('*', compress())
      app.get('/large', (c) => {
	logger.debug(`buildAppDefault(): app → ${app}`);
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
	logger.debug('<<< Exiting buildAppDefault()');
      return app
    }

    const buildAppWithEncoding = (encoding: 'gzip' | 'deflate') => {
	logger.debug(`>>> Entering buildAppWithEncoding(encoding=${encoding})`);
      const app = new Hono()
      app.use('*', compress({ encoding }))
      app.get('/large', (c) => {
	logger.debug(`buildAppWithEncoding(encoding=${encoding}): app → ${app}`);
        c.header('Content-Type', 'text/plain')
        c.header('Content-Length', '1024')
        return c.text('a'.repeat(1024))
      })
	logger.debug(`<<< Exiting buildAppWithEncoding(encoding=${encoding})`);
      return app
    }

    it('should not compress when configured encoding has q=0', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should fall back to another encoding when the preferred one has q=0', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0, deflate' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('deflate')
    })

    it('should compress when Accept-Encoding is the wildcard *', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': '*' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should compress when Accept-Encoding token differs only in case', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'GZIP' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })

    it('should not treat x-gzip as gzip', async () => {
      const app = buildAppWithEncoding('gzip')
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'x-gzip' },
      })
      expect(res.headers.get('Content-Encoding')).toBeNull()
    })

    it('should pick the encoding with the highest q value', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0.5, deflate;q=0.9' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('deflate')
    })

    it('should prefer gzip over deflate when q values are equal', async () => {
      const app = buildAppDefault()
      const res = await app.request('/large', {
        headers: { 'Accept-Encoding': 'gzip;q=0.5, deflate;q=0.5' },
      })
      expect(res.headers.get('Content-Encoding')).toBe('gzip')
    })
  })
})

async function decompressResponse(res: Response): Promise<string> {
logger.debug(`>>> Entering decompressResponse(res=${res})`);
  const decompressedStream = res.body!.pipeThrough(new DecompressionStream('gzip'))
  const decompressedResponse = new Response(decompressedStream)
logger.debug(`decompressResponse(res=${res}): decompressedStream → ${decompressedStream}`);
logger.debug(`<<< Exiting decompressResponse(res=${res})`);
  return await decompressedResponse.text()
}
