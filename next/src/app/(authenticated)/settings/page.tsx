'use client'

import { ThemeSelector } from "@/components/ui/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TagManager } from "@/components/TagManager"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Palette, User, Monitor } from "lucide-react"

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
                      <img 
                        src={user.imageUrl} 
                        alt="Profile" 
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
                        {user.primaryEmailAddress?.emailAddress || 'Manage your personal information'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/settings/profile">
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              )}

              {/* Account Actions */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Security</h3>
                      <p className="text-sm text-muted-foreground">Password, 2FA, and security settings</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/settings/security">
                      Security Settings
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Account Management</h3>
                      <p className="text-sm text-muted-foreground">Connected accounts and preferences</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/settings/account">
                      Manage Account
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}