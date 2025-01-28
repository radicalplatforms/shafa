import { hc } from 'hono/client'
import type { AppType } from '../../../hono/src/index'
import type { InferRequestType, InferResponseType } from 'hono/client'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@clerk/nextjs'

export const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/')

export type OutfitsResponse = InferResponseType<typeof client.api.outfits.$get>
export type ItemsResponse = InferResponseType<typeof client.api.items.$get>
export type TagsResponse = InferResponseType<typeof client.api.tags.$get>

export function useOutfits() {
  const { getToken } = useAuth()
  const $get = client.api.outfits.$get

  const fetcher = async (arg: InferRequestType<typeof $get>) => {
    const res = await $get(arg, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      }
    })
    return await res.json()
  }

  const { data, isLoading, error, size, setSize, isValidating, mutate } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      // First page, no previousPageData
      if (previousPageData === null) {
        return { query: { page: '0', size: '24' } }
      }

      // Reached the end
      if (!previousPageData.outfits.length || previousPageData.last_page) {
        return null
      }

      // Add page param to the key
      return { query: { page: pageIndex.toString(), size: '24' } }
    },
    fetcher
  )
 
  const outfits = data ? data.flatMap(page => page.outfits) : []
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = data?.[0]?.outfits.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.last_page)
  
  return {
    outfits,
    isLoading,
    isError: error,
    isLoadingMore,
    isReachingEnd,
    loadMore: () => setSize(size + 1),
    mutate
  }
}

export function useItems() {
  const { getToken } = useAuth()
  const $get = client.api.items.$get

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
    'get-items', 
    fetcher({})
  )
 
  return {
    items: data?.items || [],
    isLoading,
    isError: error
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



