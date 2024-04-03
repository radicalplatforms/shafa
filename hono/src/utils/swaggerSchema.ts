import * as fs from 'fs'
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { version } from '../../package.json'
import { getPathDefinitions } from './path-definitions'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

const ItemIdSchema = registry.registerParameter(
  'ItemId',
  z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: 'ksflx82z4fvxzchqcuuxb6oc',
  })
)

const OutfitIdSchema = registry.registerParameter(
  'OutfitId',
  z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: 'rvd2jeisbayz0at39aw1e30n',
  })
)

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

const pathDefinitions = getPathDefinitions(bearerAuth, ItemIdSchema, OutfitIdSchema)
pathDefinitions.forEach((pathDefinition) => {
  registry.registerPath(pathDefinition)
})

async function getOpenApiDocumentation() {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return await generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: `${version}`,
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
