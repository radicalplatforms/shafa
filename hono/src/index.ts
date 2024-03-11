import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { version } from '../package.json'
import items from './services/items'
import outfits from './services/outfits'
import swagger from './services/swagger'

const app = new Hono()

app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Internal Service Error', 500)
})

app.use('*', logger(), async (c, next) => {
  c.header('X-Logger-Middleware', 'Executed')
  await next()
})

app.use('*', prettyJSON(), async (c, next) => {
  c.header('X-PrettyJson-Middleware', 'Executed')
  await next()
})

app.get('/', async (c) => {
  return c.text(`Shafa API v${version}`)
})

const routes = app
  .route('/api/items', items)
  .route('/api/outfits', outfits)
  .route('/api/swagger', swagger)

export default app
export type AppType = typeof routes
