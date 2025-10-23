import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AgentLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* User Message Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        {/* Agent Response Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
            
            {/* Skeleton for potential outfit/item grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
