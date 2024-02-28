import { z } from 'zod';
import * as yaml from 'yaml';
import { writeFile } from 'fs/promises'; // Adjusted for modern Node.js ES module syntax
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '../../src'; // Adjust this import path based on your project structure

extendZodWithOpenApi(z);

function createZodSchemas() {
  const itemTypeEnumSchema = z.enum(['layer', 'top', 'bottom', 'footwear', 'accessory']);

  const itemsSchema = z.object({
    id: z.number(),
    name: z.string(),
    brand: z.string(),
    photo: z.string(),
    type: itemTypeEnumSchema,
    rating: z.number().default(2),
    quality: z.number().default(2),
    timestamp: z.string(),
    authorUsername: z.string(),
  });

  const outfitsSchema = z.object({
    id: z.number(),
    rating: z.number().default(2),
    wearDate: z.string(),
    authorUsername: z.string(),
  });

  const itemsToOutfitsSchema = z.object({
    itemId: z.number(),
    outfitId: z.number(),
    type: z.number(),
  });

  return { itemsSchema, outfitsSchema, itemsToOutfitsSchema };
}

function registerSchemasWithOpenAPI(registry: OpenAPIRegistry) {
  const { itemsSchema, outfitsSchema, itemsToOutfitsSchema } = createZodSchemas();

  registry.registerSchema('Item', itemsSchema.openapi({}));
  registry.registerSchema('Outfit', outfitsSchema.openapi({}));
  registry.registerSchema('ItemsToOutfits', itemsToOutfitsSchema.openapi({}));
}

function getOpenApiDocumentation(registry: OpenAPIRegistry) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Your API Title',
      description: 'API description here.',
    },
    servers: [{ url: '/api/v1' }],
  });
}

async function writeDocumentation() {
  const registry = new OpenAPIRegistry();
  registerSchemasWithOpenAPI(registry);
  const docs = getOpenApiDocumentation(registry);
  const fileContent = yaml.stringify(docs);
  await writeFile(`../../docs/swagger.yml`, fileContent, 'utf8');
  console.log('Documentation written to openapi-docs.yml');
}

writeDocumentation();
