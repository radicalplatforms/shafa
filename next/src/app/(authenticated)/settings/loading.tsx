import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="h-8 w-40 mb-4">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="mb-6">
        <div className="h-6 w-32 mb-2">
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  )
}