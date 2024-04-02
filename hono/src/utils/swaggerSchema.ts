import * as fs from 'fs'
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { ZodObject, z } from 'zod'
import { version } from '../../package.json'
import { items, outfits } from '../schema'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

const ItemIdSchema = registry.registerParameter(
  'ItemId',
  z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: '1212121',
  })
)

const OutfitIdSchema = registry.registerParameter(
  'OutfitId',
  z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: '1212121',
  })
)

// Correcting schema definitions and registrations:
const ItemSchema = z.object({
  id: z.number().int().optional(), // Making ID optional for creation
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
})

const OutfitSchema = z.object({
  id: z.number().int().optional(), // Making ID optional for creation
  itemIds: z.array(z.number().int()),
  rating: z.number().int().optional(),
  authorUsername: z.string(),
})

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

registry.registerPath({
  method: 'get',
  path: '/items',
  description: 'return all items',
  summary: 'get items',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: ItemIdSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/items',
  description: 'post all items',
  summary: 'post items',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: ItemSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'put',
  path: '/items',
  description: 'put all items',
  summary: 'put items',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: ItemIdSchema }),
  },
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: ItemSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'delete',
  path: '/items',
  description: 'delete all items',
  summary: 'delete items',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: ItemIdSchema }),
  },
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: ItemSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/outfits',
  description: 'return all outfits',
  summary: 'get outfits',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: OutfitSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/outfits',
  description: 'post all outfits',
  summary: 'get items',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: OutfitSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'put',
  path: '/outfits',
  description: 'put all items',
  summary: 'put items',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: OutfitIdSchema }),
  },
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: OutfitSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

registry.registerPath({
  method: 'delete',
  path: '/outfits',
  description: 'delete all items',
  summary: 'delete items',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: OutfitIdSchema }),
  },
  responses: {
    200: {
      description: 'Object with user data.',
      content: {
        'application/json': {
          schema: OutfitSchema,
        },
      },
    },
    500: {
      description: 'Server Error',
    },
  },
})

async function getOpenApiDocumentation() {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return await generator.generateDocument({
    openapi: `${version}`,
    info: {
      version: '1.0.0',
      title: 'Shafa API',
      description: 'A wardrobe logging, composition, and organization app',
    },
    servers: [{ url: 'https://api.shafa.app/api' }],
  })
}

export default async function writeDocumentation() {
  const docs = await getOpenApiDocumentation()
  const fileContent = JSON.stringify(docs)
  fs.writeFileSync('docs/swagger.json', fileContent, {
    encoding: 'utf-8',
  })
  console.log('Documentation written to swagger.json')
}

writeDocumentation()
