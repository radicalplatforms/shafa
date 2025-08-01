'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Shirt, Sparkles, Layers, Settings } from 'lucide-react'
import { AddOutfitModal } from '@/components/AddOutfitModal'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GREETING_HOURS = {
  MORNING: 12,
  AFTERNOON: 18
}

const NAV_LINKS = [
  { href: '/outfits', label: 'Recent Outfits', Icon: Shirt },
  { href: '/suggestions', label: 'Outfit Suggestions', Icon: Sparkles },
  { href: '/items', label: 'Items', Icon: Layers }
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
      <header className="mb-4 sm:mb-8 fade-in flex flex-col items-center gap-4 sm:gap-0 sm:flex-row sm:justify-between sm:items-center">
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold linear-gradient">Shafa</h1>
          <p className="text-base text-muted-foreground">{today}</p>
        </div>
        <div className="transition-colors duration-300">
          <Link href="/settings">
            <Button 
              variant="outline" 
              size="icon" 
              aria-label="Settings" 
              className="rounded-full w-9 h-9 bg-transparent hover:bg-muted/50 border-border"
            >
              <Settings className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
        </div>
      </header>
      <nav className="mb-6 sm:mb-8 fade-in flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="w-full sm:w-auto">
              <Button 
                variant="outline"
                className={`w-full sm:w-auto bg-transparent hover:bg-muted/50 border-border transition-colors ${
                  pathname === href ? "bg-muted/30 text-foreground" : "text-muted-foreground"
                }`}
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