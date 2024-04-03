import { z } from 'zod'
import { itemTypeEnum } from '../schema/schema'

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  photoUrl: z.string().optional(),
  type: z.enum([...itemTypeEnum]),
  rating: z.number().int(),
  createdAt: z.date(),
  authorUsername: z.string(),
})

export const OutfitSchema = z.object({
  id: z.string(),
  rating: z.number().int(),
  wearDate: z.date(),
  authorUsername: z.string(),
})

export type Item = z.infer<typeof ItemSchema>
export type Outfit = z.infer<typeof OutfitSchema>
