import { z } from 'zod';
import * as yaml from 'yaml';
import * as fs from 'fs';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

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

function registerSchemasWithOpenAPI() {
  const { itemsSchema, outfitsSchema, itemsToOutfitsSchema } = createZodSchemas();

  // Hypothetical registration for parameters
  registry.registerParameter('Item', itemsSchema);
  registry.registerParameter('Outfit', outfitsSchema);
  registry.registerParameter('ItemsToOutfits', itemsToOutfitsSchema);
}

function getOpenApiDocumentation() {
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

export default async function writeDocumentation() {
  console.log('Start writing documentation');
  registerSchemasWithOpenAPI();
  const docs = getOpenApiDocumentation();
  const fileContent = yaml.stringify(docs);
  console.log('File Content:', fileContent);
  try {
    await fs.promises.writeFile(`../../docs/swagger.yml`, fileContent, 'utf8');
    console.log('Documentation written to swagger.yml');
  } catch (error) {
    console.error('Error writing documentation:', error);
  }
}
