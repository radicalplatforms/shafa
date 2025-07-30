'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Palette } from "lucide-react"
import { useTags } from "@/lib/client"
import { Tag } from "@/components/ui/tag"

interface TagType {
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
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)

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

  const openDeleteDialog = (tagId: string) => {
    setTagToDelete(tagId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteTag = async () => {
    if (tagToDelete) {
      await deleteTag(tagToDelete)
      setTagToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const openEditDialog = (tag: TagType) => {
    setEditingTag({ ...tag })
    setIsEditDialogOpen(true)
  }

  // Filter out virtual tags (they can't be edited/deleted)
  const userTags = tags.filter((tag: TagType) => tag.userId !== 'system')

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
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Palette className="h-5 w-5" />
              Manage Tags
            </CardTitle>
            <CardDescription>
              Create and manage your personal tags for outfit organization and suggestions.
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground" 
                aria-label="Create New Tag"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Tag Name */}
                <div className="space-y-2">
                  <Label htmlFor="tag-name" className="text-sm font-medium">Tag Name</Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g., Work, Casual, Date Night"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.name.trim()) handleCreateTag()
                    }}
                    className="text-base"
                  />
                </div>
                {/* Color Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Choose Color</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                          newTag.hexColor === color 
                            ? 'border-foreground ring-2 ring-foreground/20 scale-110' 
                            : 'border-white/20 hover:border-white/40'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTag({ ...newTag, hexColor: color })}
                        aria-label={`Select ${color} color`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Label className="text-sm text-muted-foreground">Custom:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={newTag.hexColor}
                        onChange={(e) => setNewTag({ ...newTag, hexColor: e.target.value })}
                        className="w-12 h-8 p-1 border rounded cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        {newTag.hexColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="flex items-center gap-2">
                    <Tag
                      name={newTag.name || "Tag Name"}
                      hexColor={newTag.hexColor}
                      compact={false}
                    />
                    <span className="text-xs text-muted-foreground">
                      This is how your tag will appear
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setNewTag({ name: "", hexColor: "#6b7280", minDaysBeforeItemReuse: -1 })
                  }}
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTag} 
                  disabled={!newTag.name.trim()}
                  className="flex-1 sm:flex-initial"
                >
                  Create Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-2">
          {userTags.length === 0 ? (
            <div className="w-full text-center py-8">
              <div className="text-muted-foreground text-sm mb-2">No custom tags yet</div>
              <div className="text-xs text-muted-foreground">Create your first tag to get started with outfit organization!</div>
            </div>
          ) : (
            userTags.map(tag => (
              <span key={tag.id} className="inline-flex items-center">
                <button
                  type="button"
                  className="focus:outline-none cursor-pointer"
                  onClick={() => openEditDialog(tag)}
                  aria-label={`Edit tag ${tag.name}`}
                >
                  <Tag
                    name={tag.name}
                    hexColor={tag.hexColor}
                    compact={false}
                  />
                </button>
              </span>
            ))
          )}
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            {editingTag && (
              <div className="space-y-6">
                {/* Tag Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-tag-name" className="text-sm font-medium">Tag Name</Label>
                  <Input
                    id="edit-tag-name"
                    placeholder="e.g., Work, Casual, Date Night"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingTag.name.trim()) handleUpdateTag()
                    }}
                    className="text-base"
                  />
                </div>
                
                {/* Color Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Choose Color</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                          editingTag.hexColor === color 
                            ? 'border-foreground ring-2 ring-foreground/20 scale-110' 
                            : 'border-white/20 hover:border-white/40'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingTag({ ...editingTag, hexColor: color })}
                        aria-label={`Select ${color} color`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Label className="text-sm text-muted-foreground">Custom:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={editingTag.hexColor}
                        onChange={(e) => setEditingTag({ ...editingTag, hexColor: e.target.value })}
                        className="w-12 h-8 p-1 border rounded cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        {editingTag.hexColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>


                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="flex items-center gap-2">
                    <Tag
                      name={editingTag.name || "Tag Name"}
                      hexColor={editingTag.hexColor}
                      compact={false}
                    />
                    <span className="text-xs text-muted-foreground">
                      This is how your tag will appear
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="w-full flex items-center pt-6">
              <Button
                variant="destructive"
                onClick={() => { if (editingTag) { openDeleteDialog(editingTag.id); setIsEditDialogOpen(false); } }}
                className=""
              >
                Delete
              </Button>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className=""
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateTag} 
                  disabled={!editingTag?.name.trim()}
                  className=""
                >
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Tag</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this tag? This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setTagToDelete(null)
                }}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteTag}
                className="flex-1 sm:flex-initial"
              >
                Delete Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}