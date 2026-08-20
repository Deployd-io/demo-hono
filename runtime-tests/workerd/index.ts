const logger = console;
import { upgradeWebSocket } from '../../src/adapter/cloudflare-workers'
import { env, getRuntimeKey } from '../../src/helper/adapter'
import { Hono } from '../../src/hono'
import { getColorEnabledAsync } from '../../src/utils/color'

const app = new Hono()

app.get('/', (c) => c.text(`Hello from ${getRuntimeKey()}`))

app.get('/env', (c) => {
logger.debug(`>>> Entering GET_env(c=${c})`);
  const { NAME } = env<{ NAME: string }>(c)
logger.debug(`<<< Exiting GET_env(c=${c})`);
  return c.text(NAME)
})

app.get(
  '/ws',
  upgradeWebSocket(() => {
	logger.debug('>>> Entering GET_ws()');
    return {
      onMessage(event, ws) {
		logger.debug(`>>> Entering onMessage(event=${event},ws=${ws})`);
        ws.send(event.data as string)
		logger.debug(`<<< Exiting onMessage(event=${event},ws=${ws})`);
      },
    }
  })
)

app.get('/color', async (c) => {
logger.debug(`>>> Entering GET_color(c=${c})`);
logger.debug(`<<< Exiting GET_color(c=${c})`);
  return c.text((await getColorEnabledAsync()) ? 'True' : 'False')
})

export default app
