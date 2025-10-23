import type { TagRepository } from '../repositories/TagRepository'

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
  return Object.values(VIRTUAL_TAGS).filter((tag) => tag.appliesTo && tag.appliesTo(outfit))
}

export class TagService {
  constructor(private tagRepository: TagRepository) {}

  async getAllTags(userId: string) {
    const userTags = await this.tagRepository.findAll(userId)

    // Add all virtual tags at the beginning
    return [...Object.values(VIRTUAL_TAGS), ...userTags]
  }

  async createTag(userId: string, data: any) {
    // Don't allow creating a tag with a reserved virtual tag name
    if (Object.values(VIRTUAL_TAGS).some((tag) => tag.name === data.name)) {
      throw new Error(`Cannot create a tag with the reserved name "${data.name}"`)
    }

    return this.tagRepository.create(userId, data)
  }

  async updateTag(userId: string, tagId: string, data: any) {
    // Don't allow updating a virtual tag
    if (isVirtualTag(tagId)) {
      throw new Error('Cannot update a virtual tag')
    }

    return this.tagRepository.update(userId, tagId, data)
  }

  async deleteTag(userId: string, tagId: string) {
    // Don't allow deleting a virtual tag
    if (isVirtualTag(tagId)) {
      throw new Error('Cannot delete a virtual tag')
    }

    return this.tagRepository.delete(userId, tagId)
  }
}
