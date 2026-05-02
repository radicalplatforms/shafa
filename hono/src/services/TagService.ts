import type { TagRepository } from '../repositories/TagRepository'
import type { tag } from '../schema'
import { HTTPError } from '../utils/http-error'
import type { PaginationResult } from '../utils/pagination'

// Virtual tag type definition
export type VirtualTag = {
  id: string
  name: string
  hexColor: string
  createdAt: Date
  userId: string
  appliesTo?: (outfit: any) => boolean // Function to determine if this tag applies to an outfit
}

// Define virtual tags registry
export const VIRTUAL_TAGS: Record<string, VirtualTag> = {
  // Idea tag - for outfits with null wear dates (ghost outfits)
  idea_tag: {
    id: 'idea_tag',
    name: 'Idea',
    hexColor: '#9CA3AF', // Gray color
    createdAt: new Date(),
    userId: 'system',
    appliesTo: (outfit) => outfit.wearDate === null,
  },
}

// Helper function to check if a tag ID is virtual
export const isVirtualTag = (tagId: string): boolean => {
  return Object.keys(VIRTUAL_TAGS).includes(tagId)
}

// Helper function to get virtual tags that apply to an outfit
export const getApplicableVirtualTags = (outfit: any): VirtualTag[] => {
  return Object.values(VIRTUAL_TAGS).filter(
    (tag) => tag.appliesTo && tag.appliesTo(outfit)
  )
}

export type TagQueryVariables = {
  limit?: number
  offset?: number
}

export class TagService {
  constructor(private tagRepository: TagRepository) {}

  /**
   * Get all tags for a user with pagination.
   * Virtual tags are always included at the beginning, and pagination applies to user tags.
   *
   * @param {string} userId — The user's ID
   * @param {TagQueryVariables} variables — Optional query variables
   * @returns {Promise<PaginationResult<typeof tag.$inferSelect>>} — Promise resolving to paginated tags
   */
  async tags(
    userId: string,
    variables?: TagQueryVariables
  ): Promise<PaginationResult<typeof tag.$inferSelect>> {
    const pagination =
      variables?.limit !== undefined
        ? {
            offset: variables.offset ?? 0,
            limit: variables.limit,
          }
        : undefined

    const userTagsResult = await this.tagRepository.findAll(userId, pagination)
    const virtualTags = Object.values(
      VIRTUAL_TAGS
    ) as (typeof tag.$inferSelect)[]

    // Add all virtual tags at the beginning
    return {
      data: [...virtualTags, ...userTagsResult.data],
      pagination: userTagsResult.pagination,
    }
  }

  async getTagById(
    userId: string,
    tagId: string
  ): Promise<typeof tag.$inferSelect | null> {
    // Check if it's a virtual tag
    if (isVirtualTag(tagId)) {
      return VIRTUAL_TAGS[tagId] as typeof tag.$inferSelect
    }

    const allTagsResult = await this.tagRepository.findAll(userId)
    return allTagsResult.data.find((t) => t.id === tagId) || null
  }

  async createTag(
    userId: string,
    data: Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>
  ): Promise<typeof tag.$inferSelect> {
    // Don't allow creating a tag with a reserved virtual tag name
    if (Object.values(VIRTUAL_TAGS).some((tag) => tag.name === data.name)) {
      throw new HTTPError(
        400,
        `Cannot create a tag with the reserved name "${data.name}"`
      )
    }

    return this.tagRepository.create(userId, data)
  }

  async updateTag(
    userId: string,
    tagId: string,
    data: Partial<Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>>
  ): Promise<typeof tag.$inferSelect> {
    // Don't allow updating a virtual tag
    if (isVirtualTag(tagId)) {
      throw new HTTPError(400, 'Cannot update a virtual tag')
    }

    return this.tagRepository.update(userId, tagId, data)
  }

  async deleteTag(
    userId: string,
    tagId: string
  ): Promise<typeof tag.$inferSelect> {
    // Don't allow deleting a virtual tag
    if (isVirtualTag(tagId)) {
      throw new HTTPError(400, 'Cannot delete a virtual tag')
    }

    return this.tagRepository.delete(userId, tagId)
  }
}
