import { clerkMiddleware } from '@hono/clerk-auth'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import { version } from '../package.json'
import items from './controllers/items'
import outfits from './controllers/outfits'
import tags from './controllers/tags'
import agent from './services/agent'
import injectServices from './utils/inject-services'

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

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        'https://shafa.app',
        'https://*.shafa-next.pages.dev',
        'https://*.radison.workers.dev',
      ]

      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:3000')
      }

      if (!origin) return allowedOrigins[0]

      const matched = allowedOrigins.some((allowed) => {
        if (!allowed.includes('*')) {
          return origin === allowed
        }
        const pattern = allowed.replace('*', '.*')
        const regex = new RegExp('^' + pattern + '$')
        return regex.test(origin)
      })

      return matched ? origin : allowedOrigins[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Total-Count'],
    maxAge: 60,
    credentials: true,
  })
)

app.use('*', clerkMiddleware())

const routes = app
  .get('/', async (c) => {
    return c.text(`Shafa API v${version}`)
  })
  .route('/api/agent', agent)
  .route('/api/items', items)
  .route('/api/outfits', outfits)
  .route('/api/tags', tags)

export default app
export type AppType = typeof routes
