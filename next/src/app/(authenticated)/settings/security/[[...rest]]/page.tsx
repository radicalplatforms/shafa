'use client'

import { UserProfile } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/settings" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your password, two-factor authentication, and security preferences.
        </p>
      </div>

      <div className="bg-card/80 shadow-md border border-border rounded-lg overflow-hidden">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "shadow-none border-none bg-transparent",
              navbar: "hidden",
              pageScrollBox: "p-6",
              page: "bg-transparent shadow-none",
              profileSection: "bg-transparent",
              profileSectionPrimaryButton: "bg-primary text-primary-foreground hover:bg-primary/90",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
              footerActionLink: "text-primary hover:text-primary/80",
              card: "bg-transparent shadow-none border-none",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              formFieldLabel: "text-foreground",
              formFieldInput: "bg-background border-border text-foreground",
              identityPreview: "bg-background/50 border-border",
              profileSectionContent: "text-foreground",
            },
            variables: {
              borderRadius: "0.5rem",
              colorBackground: "transparent",
              colorInputBackground: "hsl(var(--background))",
              colorInputText: "hsl(var(--foreground))",
              colorText: "hsl(var(--foreground))",
              colorTextSecondary: "hsl(var(--muted-foreground))",
            },
          }}
          routing="path"
          path="/settings/security"
        />
      </div>
    </div>
  )
}