'use client'

import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SettingsPage() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Appearance</h2>
        <ThemeToggle />
      </div>
    </div>
  )
}