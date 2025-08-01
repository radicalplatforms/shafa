'use client'

import { ThemeSelector } from "@/components/ui/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TagManager } from "@/components/TagManager"
import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import { User, Monitor } from "lucide-react"

export default function SettingsPage() {
  const { user } = useUser()
  
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences, customize your experience, and organize your wardrobe.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance Settings */}
        <Card className="bg-card/80 shadow-md border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Monitor className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how Shafa looks and feels across all your devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-3">Theme Preference</h4>
                <ThemeSelector />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose your preferred theme. System will automatically match your device&apos;s theme.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tag Management */}
        <TagManager />

        {/* User Profile */}
        <Card className="bg-card/80 shadow-md border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5" />
              Account & Profile
            </CardTitle>
            <CardDescription>
              Manage your account information and access advanced profile settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current User Info */}
              {user && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                  <div className="flex items-center gap-4">
                    {user.imageUrl ? (
                      <Image 
                        src={user.imageUrl} 
                        alt="Profile" 
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-foreground">
                        {user.fullName || user.firstName || 'Your Profile'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user.primaryEmailAddress?.emailAddress || 'Signed in with Clerk'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Account managed via Clerk
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}