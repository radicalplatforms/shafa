import OutfitList from '@/components/OutfitList'
import OutfitSuggestions from '@/components/OutfitSuggestions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Shirt, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 py-8">
        <header className="mb-12 fade-in">
          <h1 className="text-4xl font-bold mb-2 linear-gradient">Shafa</h1>
          <p className="text-xl text-muted-foreground">Your personal wardrobe assistant</p>
        </header>
        <Tabs defaultValue="outfits" className="w-full fade-in">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="outfits" className="text-lg py-3">
              <Shirt className="mr-2 h-5 w-5" />
              Recent Outfits
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-lg py-3">
              <Sparkles className="mr-2 h-5 w-5" />
              Outfit Suggestions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outfits" className="mt-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Your Recent Outfits</h2>
              <Button
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
            <OutfitList />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Suggested Outfits</h2>
              <Button
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
            <OutfitSuggestions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

