import type { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { ItemSchema, OutfitSchema } from '../schema/zod-definitions'

export function getPathDefinitions(
  bearerAuth: {
    name: string
    ref: {
      $ref: string
    }
  },
  ItemIdSchema: z.ZodString,
  OutfitIdSchema: z.ZodString
): RouteConfig[] {
  return [
    {
      method: 'get',
      path: '/items',
      description: 'Get all items in the wardrobe',
      summary: 'Retrieve items',
      security: [{ [bearerAuth.name]: [] }],
      responses: {
        200: {
          description: 'List of items.',
          content: {
            'application/json': {
              schema: ItemSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'post',
      path: '/items',
      description: 'Add a new item to the wardrobe',
      summary: 'Add item',
      security: [{ [bearerAuth.name]: [] }],
      responses: {
        200: {
          description: 'Item added successfully.',
          content: {
            'application/json': {
              schema: ItemSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'put',
      path: '/items',
      description: 'Update an existing item in the wardrobe',
      summary: 'Update item',
      security: [{ [bearerAuth.name]: [] }],
      request: {
        params: z.object({ id: ItemIdSchema }),
      },
      responses: {
        200: {
          description: 'Item updated successfully.',
          content: {
            'application/json': {
              schema: ItemSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'delete',
      path: '/items',
      description: 'Delete an item from the wardrobe',
      summary: 'Delete item',
      security: [{ [bearerAuth.name]: [] }],
      request: {
        params: z.object({ id: ItemIdSchema }),
      },
      responses: {
        200: {
          description: 'Item deleted successfully.',
          content: {
            'application/json': {
              schema: ItemSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'get',
      path: '/outfits',
      description: 'Get all logged outfits',
      summary: 'Retrieve outfits',
      security: [{ [bearerAuth.name]: [] }],
      responses: {
        200: {
          description: 'List of outfits.',
          content: {
            'application/json': {
              schema: OutfitSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'post',
      path: '/outfits',
      description: 'Log a new outfit for the day',
      summary: 'Log outfit',
      security: [{ [bearerAuth.name]: [] }],
      responses: {
        200: {
          description: 'Outfit logged successfully.',
          content: {
            'application/json': {
              schema: OutfitSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'put',
      path: '/outfits',
      description: 'Update an existing outfit',
      summary: 'Update outfit',
      security: [{ [bearerAuth.name]: [] }],
      request: {
        params: z.object({ id: OutfitIdSchema }),
      },
      responses: {
        200: {
          description: 'Outfit updated successfully.',
          content: {
            'application/json': {
              schema: OutfitSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
    {
      method: 'delete',
      path: '/outfits',
      description: 'Delete an outfit from the logged outfits',
      summary: 'Delete outfit',
      security: [{ [bearerAuth.name]: [] }],
      request: {
        params: z.object({ id: OutfitIdSchema }),
      },
      responses: {
        200: {
          description: 'Outfit deleted successfully.',
          content: {
            'application/json': {
              schema: OutfitSchema,
            },
          },
        },
        500: {
          description: 'Internal Server Error',
        },
      },
    },
  ]
}
