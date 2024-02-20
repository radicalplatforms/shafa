import { SwaggerUI } from '@hono/swagger-ui' // Keep this import
// import { swaggerUI } from '@hono/swagger-ui' // Remove this duplicate import
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'
import { items, itemsToOutfits, itemTypeEnum } from '../schema'
import type { Bindings, Variables } from '../utils/injectDB'
import injectDB from '../utils/injectDB'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/ui', (c) => {
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
        ${SwaggerUI({ url: '/docs/swagger.json' })}
      </body>
    </html>
  `)
})

export default app
