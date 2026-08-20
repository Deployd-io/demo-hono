const logger = console;
import { Hono } from '../../hono'
import { handle } from './handler'

describe('Adapter for Next.js', () => {
  it('Should return 200 response', async () => {
    const app = new Hono()
    app.get('/api/author/:name', async (c) => {
	logger.debug(`>>> Entering GET_api_author_name(c=${c})`);
      const name = c.req.param('name')
      return c.json({
        path: '/api/author/:name',
        name,
      })
    })
    const handler = handle(app)
    const req = new Request('http://localhost/api/author/hono')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      path: '/api/author/:name',
      name: 'hono',
    })
  })

  it('Should not use `route()` if path argument is not passed', async () => {
    const app = new Hono().basePath('/api')

    app.onError((e) => {
      throw e
    })
    app.get('/error', () => {
	logger.debug('>>> Entering GET_error()');
	logger.debug('<<< Exiting GET_error()');
      throw new Error('Custom Error')
    })

    const handler = handle(app)
    const req = new Request('http://localhost/api/error')
    expect(() => handler(req)).toThrowError('Custom Error')
  })
})
