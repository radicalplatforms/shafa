import { hc } from 'hono/client'
import type { AppType } from '../../../hono/src/index'
import type { InferRequestType, InferResponseType } from 'hono/client'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@clerk/nextjs'

export const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/')

export type OutfitSuggestionsResponse = InferResponseType<typeof client.api.outfits.suggest.$get>
export type OutfitsResponse = InferResponseType<typeof client.api.outfits.$get>
export type ItemsResponse = InferResponseType<typeof client.api.items.$get>
export type TagsResponse = InferResponseType<typeof client.api.tags.$get>

export function useOutfits() {
  const { getToken } = useAuth()
  const $get = client.api.outfits.$get
  const $delete = client.api.outfits[':id'].$delete

  const getKey = (pageIndex: number, previousPageData: any) => {
    // First page, no previousPageData
    if (previousPageData === null) {
      return ['outfits', '0', '48']
    }

    // Reached the end
    if (!previousPageData.outfits.length || previousPageData.last_page) {
      return null
    }

    // Add page param to the key
    return ['outfits', pageIndex.toString(), '48']
  }

  const fetcher = async (arg: [string, string, string]) => {
    const res = await $get({ 
      query: { page: arg[1], size: arg[2] } 
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
    })
    return await res.json()
  }

  const { data, isLoading, error, size, setSize, isValidating, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      initialSize: 1,
    }
  )
 
  const outfits = data ? data.flatMap(page => page.outfits) : []
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = data?.[0]?.outfits.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.last_page)

  const deleteOutfit = async (outfitId: string) => {
    try {
      const res = await $delete({ param: { id: outfitId } }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        }
      })
      if (res.ok) {
        await mutate()
      }
    } catch (error) {
      console.error('Error deleting outfit:', error)
      throw error
    }
  }
  
  return {
    outfits,
    isLoading,
    isError: error,
    isLoadingMore,
    isReachingEnd,
    loadMore: () => setSize(size + 1),
    mutate,
    deleteOutfit
  }
}

export function useSuggestedOutfits(tagId?: string) {
  const { getToken } = useAuth()
  const $get = client.api.outfits.suggest.$get

  const getKey = (pageIndex: number, previousPageData: any) => {
    // First page, no previousPageData
    if (previousPageData === null) {
      return ['suggested-outfits', '0', '48', tagId]
    }

    // Reached the end
    if (!previousPageData.suggestions.length || previousPageData.metadata?.last_page) {
      return null
    }

    // Add page param to the key
    return ['suggested-outfits', pageIndex.toString(), '48', tagId]
  }

  const fetcher = async (arg: [string, string, string, string | undefined]) => {
    const queryParams: { page: string; size: string; tagId?: string } = { 
      page: arg[1], 
      size: arg[2]
    }
    
    // Add tagId to query params if it exists
    if (arg[3]) {
      queryParams.tagId = arg[3]
    }
    
    const res = await $get({ 
      query: queryParams
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
    })
    return await res.json()
  }

  const { data, isLoading, error, size, setSize, isValidating, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      initialSize: 1,
    }
  )
 
  const suggestions = data ? data.flatMap(page => page.suggestions) : []
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = data?.[0]?.suggestions.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.metadata?.last_page)
  
  return {
    suggestions,
    isLoading,
    isError: error,
    isLoadingMore,
    isReachingEnd,
    loadMore: () => setSize(size + 1),
    mutate,
    selectedTagId: tagId
  }
}

export function useItems() {
  const { getToken } = useAuth()
  const $get = client.api.items.$get
  const $patch = client.api.items.archive[':id'].$patch

  const fetcher = (arg: InferRequestType<typeof $get>) => async () => {
    const res = await $get(arg, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      }
    })
    return await res.json()
  }

  const { data, isLoading, error, mutate } = useSWR(
    'get-items', 
    fetcher({})
  )
 
  const archiveItem = async (itemId: string, archive: boolean) => {
    try {
      const res = await $patch({ param: { id: itemId }, json: { isArchived: archive } }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
      })
      
      if (res.ok) {
        await mutate()
      }
      return res.ok
    } catch (error) {
      console.error('Error updating item archive status:', error)
      return false
    }
  }

  return {
    items: data?.items || [],
    isLoading,
    isError: error,
    mutate,
    archiveItem
  }
}

export function useTags() {
  const { getToken } = useAuth()
  const $get = client.api.tags.$get

  const fetcher = (arg: InferRequestType<typeof $get>) => async () => {
    const res = await $get(arg, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      }
    })
    return await res.json()
  }

  const { data, isLoading, error } = useSWR(
    'get-tags', 
    fetcher({})
  )
 
  return {
    tags: data,
    isLoading,
    isError: error
  }
}



