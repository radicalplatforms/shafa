'use client'

import { useState, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Shirt, Sparkles, Calendar, Flame } from 'lucide-react'
import { AddOutfitModal } from '@/components/AddOutfitModal'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { client } from '@/lib/client'

// Move static data outside component
const GREETING_HOURS = {
  MORNING: 12,
  AFTERNOON: 18
}

const NAV_LINKS = [
  { href: '/outfits', label: 'Recent Outfits', Icon: Shirt },
  { href: '/suggestions', label: 'Outfit Suggestions', Icon: Sparkles }
] as const

export default function AuthenticatedHeader() {
  const pathname = usePathname()
  const [greeting, setGreeting] = useState('')
  const [today] = useState(() => 
    new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  )

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < GREETING_HOURS.MORNING) setGreeting('Good Morning')
    else if (hour < GREETING_HOURS.AFTERNOON) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [])

  return (
    <>
      <header className="mb-4 sm:mb-8 fade-in flex flex-col items-center gap-4 sm:gap-0 sm:flex-row sm:justify-between sm:items-start">
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold linear-gradient">Shafa</h1>
          <p className="text-base text-muted-foreground">{today}</p>
        </div>
      </header>
      <nav className="mb-6 sm:mb-8 fade-in flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="w-full sm:w-auto">
              <Button 
                variant={pathname === href ? "default" : "secondary"}
                className="w-full sm:w-auto"
              >
                <Icon className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />
                {label}
              </Button>
            </Link>
          ))}
        </div>
        <AddOutfitModal onSuccess={() => {
          window.dispatchEvent(new Event('outfitCreated'))
        }} />
      </nav>
    </>
  )
}