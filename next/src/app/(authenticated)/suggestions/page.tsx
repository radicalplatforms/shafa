'use client'

import { Suspense } from 'react'
import OutfitSuggestions from '@/components/OutfitSuggestions'
import OutfitSuggestionsLoading from '@/components/OutfitSuggestionsLoading'

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<OutfitSuggestionsLoading />}>
      <OutfitSuggestions />
    </Suspense>
  )
} 