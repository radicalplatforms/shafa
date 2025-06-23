'use client'

import { useState } from "react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

export default function SettingsPage() {
  const [tags, setTags] = useState([
    { id: "1", name: "Work", hexColor: "#fbbf24" },
    { id: "2", name: "Casual", hexColor: "#34d399" },
    { id: "3", name: "Sport", hexColor: "#60a5fa" },
  ])
  const [newTag, setNewTag] = useState("")

  const handleAddTag = () => {
    if (!newTag.trim()) return
    setTags([
      ...tags,
      {
        id: Math.random().toString(36).slice(2),
        name: newTag.trim(),
        hexColor: "#a1a1aa"
      },
    ])
    setNewTag("")
  }

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(tag => tag.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">Settings</h1>
      <p className="text-muted-foreground mb-6">
        Manage your preferences and personalize your experience.
      </p>

      <div className="grid gap-6">
        <Card className="bg-card/80 shadow-md border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred theme mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 shadow-md border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              Manage Tags
            </CardTitle>
            <CardDescription>
              Add or remove your personal tags for outfit suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.length === 0 ? (
                <span className="text-muted-foreground text-sm">No tags yet.</span>
              ) : (
                tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: tag.hexColor + "22", color: tag.hexColor }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      className="ml-2 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTag(tag.id)}
                      aria-label={`Remove tag ${tag.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddTag()
                }}
                className="max-w-xs"
              />
              <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}