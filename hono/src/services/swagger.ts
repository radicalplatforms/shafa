import { SwaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import type { Bindings, Variables } from '../utils/injectDB'
import swaggerJson from '../../docs/swagger1.json'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/doc', (c) => {
  return c.json(swaggerJson)
})

app.get('/', (c) => {
  return c.html(`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Custom Swagger" />
        <title>Custom Swagger</title>
        <script>
          // custom script
        </script>
        <style>
          /* custom style */
        </style>
      </head>
      <body>
        ${SwaggerUI({ spec: swaggerJson, url: '/doc' })}
      </body>
    </html>
  `)
})

export default app
