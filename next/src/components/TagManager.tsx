'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { X, Edit, Plus, Palette, MoreVertical, Trash2, Minus } from "lucide-react"
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border"
                style={{ 
                  backgroundColor: tag.hexColor + "15", 
                  borderColor: tag.hexColor + "30",
                  color: tag.hexColor 
                }}
              >
                <span>{tag.name}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
                      aria-label={`Manage tag ${tag.name}`}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1" align="end">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-2"
                        onClick={() => openEditDialog(tag)}
                      >
                        <Edit className="w-3 h-3 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
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

              {/* Advanced Options - Collapsible */}
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Options
                </summary>
                <div className="mt-3 space-y-3 pl-6 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="min-days" className="text-sm font-medium">
                      Minimum Days Before Item Reuse
                    </Label>
                                         <div className="flex items-center gap-2">
                       <div className="flex items-center border rounded-md">
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 rounded-r-none border-r"
                           onClick={() => setNewTag({ 
                             ...newTag, 
                             minDaysBeforeItemReuse: Math.max(-1, newTag.minDaysBeforeItemReuse - 1) 
                           })}
                           disabled={newTag.minDaysBeforeItemReuse <= -1}
                         >
                           <Minus className="h-3 w-3" />
                         </Button>
                         <Input
                           id="min-days"
                           type="number"
                           min="-1"
                           max="365"
                           value={newTag.minDaysBeforeItemReuse}
                           onChange={(e) => setNewTag({ ...newTag, minDaysBeforeItemReuse: parseInt(e.target.value) || -1 })}
                           className="w-16 text-center border-0 rounded-none focus:ring-0 focus:border-0"
                         />
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 rounded-l-none border-l"
                           onClick={() => setNewTag({ 
                             ...newTag, 
                             minDaysBeforeItemReuse: Math.min(365, newTag.minDaysBeforeItemReuse + 1) 
                           })}
                           disabled={newTag.minDaysBeforeItemReuse >= 365}
                         >
                           <Plus className="h-3 w-3" />
                         </Button>
                       </div>
                       <span className="text-sm text-muted-foreground">days</span>
                     </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Prevents reusing items with this tag too frequently. Set to -1 for no restriction.
                    </p>
                  </div>
                </div>
              </details>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border"
                    style={{ 
                      backgroundColor: newTag.hexColor + "15", 
                      borderColor: newTag.hexColor + "30",
                      color: newTag.hexColor 
                    }}
                  >
                    <span>{newTag.name || "Tag Name"}</span>
                    <MoreVertical className="w-3 h-3 opacity-60" />
                  </div>
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

                {/* Advanced Options - Collapsible */}
                <details className="group">
                  <summary className="flex items-center gap-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Advanced Options
                  </summary>
                  <div className="mt-3 space-y-3 pl-6 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label htmlFor="edit-min-days" className="text-sm font-medium">
                        Minimum Days Before Item Reuse
                      </Label>
                                             <div className="flex items-center gap-2">
                         <div className="flex items-center border rounded-md">
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             className="h-8 w-8 p-0 rounded-r-none border-r"
                             onClick={() => setEditingTag({ 
                               ...editingTag, 
                               minDaysBeforeItemReuse: Math.max(-1, editingTag.minDaysBeforeItemReuse - 1) 
                             })}
                             disabled={editingTag.minDaysBeforeItemReuse <= -1}
                           >
                             <Minus className="h-3 w-3" />
                           </Button>
                           <Input
                             id="edit-min-days"
                             type="number"
                             min="-1"
                             max="365"
                             value={editingTag.minDaysBeforeItemReuse}
                             onChange={(e) => setEditingTag({ ...editingTag, minDaysBeforeItemReuse: parseInt(e.target.value) || -1 })}
                             className="w-16 text-center border-0 rounded-none focus:ring-0 focus:border-0"
                           />
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             className="h-8 w-8 p-0 rounded-l-none border-l"
                             onClick={() => setEditingTag({ 
                               ...editingTag, 
                               minDaysBeforeItemReuse: Math.min(365, editingTag.minDaysBeforeItemReuse + 1) 
                             })}
                             disabled={editingTag.minDaysBeforeItemReuse >= 365}
                           >
                             <Plus className="h-3 w-3" />
                           </Button>
                         </div>
                         <span className="text-sm text-muted-foreground">days</span>
                       </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Prevents reusing items with this tag too frequently. Set to -1 for no restriction.
                      </p>
                    </div>
                  </div>
                </details>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border"
                      style={{ 
                        backgroundColor: editingTag.hexColor + "15", 
                        borderColor: editingTag.hexColor + "30",
                        color: editingTag.hexColor 
                      }}
                    >
                      <span>{editingTag.name || "Tag Name"}</span>
                      <MoreVertical className="w-3 h-3 opacity-60" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      This is how your tag will appear
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTag} 
                disabled={!editingTag?.name.trim()}
                className="flex-1 sm:flex-initial"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}