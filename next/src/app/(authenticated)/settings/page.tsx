'use client'

import { ThemeSelector } from "@/components/ui/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TagManager } from "@/components/TagManager"
import { UserProfile } from "@clerk/nextjs"
import { Palette, User, Monitor } from "lucide-react"

export default function SettingsPage() {
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
              Manage your account information, security settings, and personal details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background/50 p-1">
              <UserProfile
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "shadow-none border-none bg-transparent",
                    navbar: "hidden",
                    pageScrollBox: "p-0",
                    page: "bg-transparent shadow-none",
                    profileSection: "bg-transparent",
                    profileSectionPrimaryButton: "bg-primary text-primary-foreground hover:bg-primary/90",
                    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                    footerActionLink: "text-primary hover:text-primary/80",
                  },
                  variables: {
                    borderRadius: "0.5rem",
                  },
                }}
                routing="path"
                path="/settings"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}