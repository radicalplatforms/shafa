'use client'

import { UserProfile } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AccountPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/settings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
          <p className="text-muted-foreground">
            Manage your connected accounts, email addresses, and account preferences.
          </p>
        </div>
      </div>

      <div className="min-h-[600px]">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "bg-card border border-border rounded-lg shadow-sm",
              navbar: "hidden",
              pageScrollBox: "p-8",
              page: "bg-transparent",
              profileSection: "space-y-6",
              profileSectionPrimaryButton: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2",
              footerActionLink: "text-primary hover:text-primary/80",
              card: "bg-card border border-border rounded-lg p-6 space-y-4",
              headerTitle: "text-foreground text-xl font-semibold",
              headerSubtitle: "text-muted-foreground text-sm",
              socialButtonsBlockButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-md",
              formFieldLabel: "text-foreground text-sm font-medium",
              formFieldInput: "bg-background border border-border text-foreground rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent",
              identityPreview: "bg-background/50 border border-border rounded-md p-3",
              profileSectionContent: "text-foreground",
              formFieldRow: "space-y-2",
              formFieldAction: "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded-md px-3 py-2",
              badge: "bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-1 text-xs",
              alertError: "bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3",
              alertWarning: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-md p-3",
              alertSuccess: "bg-green-500/10 text-green-600 border border-green-500/20 rounded-md p-3",
            },
            variables: {
              borderRadius: "0.5rem",
              colorBackground: "hsl(var(--card))",
              colorInputBackground: "hsl(var(--background))",
              colorInputText: "hsl(var(--foreground))",
              colorText: "hsl(var(--foreground))",
              colorTextSecondary: "hsl(var(--muted-foreground))",
              colorPrimary: "hsl(var(--primary))",
              colorDanger: "hsl(var(--destructive))",
              colorSuccess: "hsl(var(--green-600))",
              colorWarning: "hsl(var(--yellow-600))",
              colorNeutral: "hsl(var(--muted))",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: "400",
            },
          }}
          routing="path"
          path="/settings/account"
        />
      </div>
    </div>
  )
}