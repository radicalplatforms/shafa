'use client'

import { Waitlist } from '@clerk/nextjs'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Waitlist />
    </div>
  )
}

