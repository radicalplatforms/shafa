'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { X, Edit, Plus, Palette } from "lucide-react"
import { useTags } from "@/lib/client"

interface Tag {
  id: string
  name: string
  hexColor: string
  minDaysBeforeItemReuse: number
  createdAt: string | Date
  userId: string
}

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#6b7280", "#374151"
]

export function TagManager() {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags()
  const [newTag, setNewTag] = useState({ name: "", hexColor: "#6b7280", minDaysBeforeItemReuse: -1 })
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return
    
    const success = await createTag(newTag)
    if (success) {
      setNewTag({ name: "", hexColor: "#6b7280", minDaysBeforeItemReuse: -1 })
      setIsCreateDialogOpen(false)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return
    
    const success = await updateTag(editingTag.id, {
      name: editingTag.name,
      hexColor: editingTag.hexColor,
      minDaysBeforeItemReuse: editingTag.minDaysBeforeItemReuse
    })
    if (success) {
      setEditingTag(null)
      setIsEditDialogOpen(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (confirm("Are you sure you want to delete this tag? This action cannot be undone.")) {
      await deleteTag(tagId)
    }
  }

  const openEditDialog = (tag: Tag) => {
    setEditingTag({ ...tag })
    setIsEditDialogOpen(true)
  }

  // Filter out virtual tags (they can't be edited/deleted)
  const userTags = tags.filter(tag => tag.userId !== 'system')

  if (isLoading) {
    return (
      <Card className="bg-card/80 shadow-md border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" />
            Manage Tags
          </CardTitle>
          <CardDescription>Loading tags...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-16 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 shadow-md border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Palette className="h-5 w-5" />
          Manage Tags
        </CardTitle>
        <CardDescription>
          Create and manage your personal tags for outfit organization and suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
          {userTags.length === 0 ? (
            <div className="w-full text-center py-8">
              <div className="text-muted-foreground text-sm mb-2">No custom tags yet</div>
              <div className="text-xs text-muted-foreground">Create your first tag to get started with outfit organization!</div>
            </div>
          ) : (
            userTags.map(tag => (
              <div
                key={tag.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border group"
                style={{ 
                  backgroundColor: tag.hexColor + "15", 
                  borderColor: tag.hexColor + "30",
                  color: tag.hexColor 
                }}
              >
                <span>{tag.name}</span>
                <div className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-blue-600 transition-colors"
                    onClick={() => openEditDialog(tag)}
                    aria-label={`Edit tag ${tag.name}`}
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleDeleteTag(tag.id)}
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create New Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  placeholder="Enter tag name"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTag()
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTag.hexColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTag({ ...newTag, hexColor: color })}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={newTag.hexColor}
                  onChange={(e) => setNewTag({ ...newTag, hexColor: e.target.value })}
                  className="w-full h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-days">Minimum Days Before Item Reuse</Label>
                <Input
                  id="min-days"
                  type="number"
                  min="-1"
                  max="365"
                  value={newTag.minDaysBeforeItemReuse}
                  onChange={(e) => setNewTag({ ...newTag, minDaysBeforeItemReuse: parseInt(e.target.value) || -1 })}
                />
                <p className="text-xs text-muted-foreground">
                  Set to -1 for no restriction, or specify days to prevent reusing items too frequently.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTag} disabled={!newTag.name.trim()}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            {editingTag && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tag-name">Tag Name</Label>
                  <Input
                    id="edit-tag-name"
                    placeholder="Enter tag name"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateTag()
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          editingTag.hexColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingTag({ ...editingTag, hexColor: color })}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={editingTag.hexColor}
                    onChange={(e) => setEditingTag({ ...editingTag, hexColor: e.target.value })}
                    className="w-full h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-min-days">Minimum Days Before Item Reuse</Label>
                  <Input
                    id="edit-min-days"
                    type="number"
                    min="-1"
                    max="365"
                    value={editingTag.minDaysBeforeItemReuse}
                    onChange={(e) => setEditingTag({ ...editingTag, minDaysBeforeItemReuse: parseInt(e.target.value) || -1 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to -1 for no restriction, or specify days to prevent reusing items too frequently.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTag} disabled={!editingTag?.name.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}