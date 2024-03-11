import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
    extendZodWithOpenApi,
  } from '../src'; // Adjust the import path as necessary
  import { z } from 'zod';
  import * as yaml from 'yaml';
  import * as fs from 'fs';
  
  extendZodWithOpenApi(z);
  
  const registry = new OpenAPIRegistry();
  
  // Item and Outfit Schemas
  const ItemSchema = z.object({
    id: z.number().int64().optional(), // Making ID optional for creation
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
  }).openapi({ name: 'Item' });
  
  const OutfitSchema = z.object({
    id: z.number().int64().optional(), // Making ID optional for creation
    itemIds: z.array(z.number().int64()),
    rating: z.number().int32().optional(),
    authorUsername: z.string(),
  }).openapi({ name: 'Outfit' });
  
  registry.registerComponent('schemas', 'Item', ItemSchema.openapi);
  registry.registerComponent('schemas', 'Outfit', OutfitSchema.openapi);
  
  // Register paths for items
  registry.registerPath({
    method: 'get',
    path: '/items',
    summary: 'List all items',
    responses: {
      200: {
        description: 'A list of items',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/Item' },
            },
          },
        },
      },
    },
  });
  
  registry.registerPath({
    method: 'post',
    path: '/items',
    summary: 'Create a new item',
    requestBody: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Item' },
        },
      },
    },
    responses: {
      201: {
        description: 'Item created',
      },
    },
  });
  
  // Register paths for outfits
  registry.registerPath({
    method: 'get',
    path: '/outfits',
    summary: 'List all outfits',
    responses: {
      200: {
        description: 'A list of outfits',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/Outfit' },
            },
          },
        },
      },
    },
  });
  
  registry.registerPath({
    method: 'post',
    path: '/outfits',
    summary: 'Create a new outfit',
    requestBody: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Outfit' },
        },
      },
    },
    responses: {
      201: {
        description: 'Outfit created',
      },
    },
  });
  
  function getOpenApiDocumentation() {
    const generator = new OpenApiGeneratorV3(registry.definitions);
  
    return generator.generateDocument({
      openapi: '3.0.0',
      info: {
        title: 'Fashion App API',
        version: '1.0.0',
        description: 'API for managing fashion items and outfits',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
      ],
    });
  }
  
  function writeDocumentation() {
    const docs = getOpenApiDocumentation();
  
    const fileContent = yaml.stringify(docs);
  
    // Adjust the file path and name as necessary
    fs.writeFileSync(`./openapi-docs.yml`, fileContent, {
      encoding: 'utf-8',
    });
  }
  
  writeDocumentation();
  