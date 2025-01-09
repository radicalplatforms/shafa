export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 py-12">
        <header className="mb-8 fade-in flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 linear-gradient">Shafa</h1>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="text-right">
            <div className="h-4 w-32 bg-muted rounded mb-1 animate-pulse" />
            <div className="flex items-center justify-end">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </header>
        <nav className="mb-8 fade-in flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="h-9 w-32 bg-muted rounded animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 w-9 bg-muted rounded animate-pulse" />
        </nav>
        <div className="animate-pulse">
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
} 