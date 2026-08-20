import { writeFile } from 'node:fs'
import * as path from 'node:path'
const logger = console;

const count = 200

const generateRoutes = (count: number) => {
logger.debug(`>>> Entering generateRoutes(count=${count})`);
  let routes = `import { Hono } from '../../../src'
export const app = new Hono()`
  for (let i = 1; i <= count; i++) {
	logger.debug(`generateRoutes(count=${count}): routes → ${routes}`);
    routes += `
  .get('/route${i}/:id', (c) => {
    return c.json({
      ok: true
    })
  })`
  }
logger.debug(`generateRoutes(count=${count}): app → ${app}`);
logger.debug(`<<< Exiting generateRoutes(count=${count})`);
  return routes
}

const routes = generateRoutes(count)

writeFile(path.join(import.meta.dirname, '../generated/app.ts'), routes, (err) => {
  if (err) {
    throw err
  }
  console.log(`${count} routes have been written to app.ts`)
})
