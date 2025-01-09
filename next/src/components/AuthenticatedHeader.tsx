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
  const [streak, setStreak] = useState<number | null>(null)
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

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const response = await client.outfits.streak.$get()
        const data = await response.json()
        setStreak(data.current_streak)
      } catch (err) {
        console.error('Failed to fetch streak:', err)
        setStreak(null)
      }
    }

    fetchStreak()

    // Refresh streak when new outfit is created
    const handleOutfitCreated = () => {
      fetchStreak()
    }

    window.addEventListener('outfitCreated', handleOutfitCreated)
    return () => window.removeEventListener('outfitCreated', handleOutfitCreated)
  }, [])

  return (
    <>
      <header className="mb-8 fade-in flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2 linear-gradient">Shafa</h1>
          <p className="text-xl text-muted-foreground">{greeting}, Radison.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">{today}</p>
          {streak !== null && (
            <div className="flex items-center justify-end">
              <Flame className="h-4 w-4 mr-1 text-orange-500" />
              <span className="font-medium">{streak} day streak</span>
            </div>
          )}
        </div>
      </header>
      <nav className="mb-8 fade-in flex justify-between items-center">
        <div className="flex space-x-2">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link key={href} href={href}>
              <Button 
                variant={pathname === href ? "default" : "secondary"}
              >
                <Icon className="mr-1 h-5 w-5" />
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