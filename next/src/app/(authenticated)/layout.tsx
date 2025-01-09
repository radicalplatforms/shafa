import { Suspense } from 'react'
import AuthenticatedHeader from '@/components/AuthenticatedHeader'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 py-12">
        <Suspense>
          <AuthenticatedHeader />
        </Suspense>
        {children}
      </div>
    </div>
  )
}