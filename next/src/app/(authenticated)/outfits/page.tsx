'use client'

import { Suspense } from 'react'
import OutfitList from '@/components/OutfitList'
import OutfitListLoading from '@/components/OutfitListLoading'

export default function OutfitsPage() {
  return (
    <Suspense fallback={<OutfitListLoading />}>
      <OutfitList />
    </Suspense>
  )
}