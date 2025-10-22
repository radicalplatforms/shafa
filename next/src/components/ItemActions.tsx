'use client'

import { MoreHorizontal, Edit, Trash2, Eye, Archive, Ban, ArchiveRestore, Loader2 } from 'lucide-react'
import { ItemsResponse } from '@/lib/client'
import { ITEM_STATUS, ItemStatus } from '@/lib/types'
import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Button } from '@/components/ui/button'

interface ItemActionsProps {
  item: ItemsResponse['items'][number]
  onView?: (item: ItemsResponse['items'][number]) => void
  onEdit?: (item: ItemsResponse['items'][number]) => void
  onDelete?: (item: ItemsResponse['items'][number]) => void
  onStatusChange?: (itemId: string, status: ItemStatus) => Promise<void>
  isStatusChanging?: boolean
  changingToStatus?: ItemStatus
  // Display options
  showAsPopover?: boolean
  showThreeDotsButton?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

const statusTransitions = {
  [ITEM_STATUS.AVAILABLE]: [
    { status: ITEM_STATUS.WITHHELD, label: 'Withhold Item', icon: Ban },
    { status: ITEM_STATUS.RETIRED, label: 'Retire Item', icon: Archive },
  ],
  [ITEM_STATUS.WITHHELD]: [
    { status: ITEM_STATUS.AVAILABLE, label: 'Make Available', icon: ArchiveRestore },
    { status: ITEM_STATUS.RETIRED, label: 'Retire Item', icon: Archive },
  ],
  [ITEM_STATUS.RETIRED]: [
    { status: ITEM_STATUS.AVAILABLE, label: 'Make Available', icon: ArchiveRestore },
    { status: ITEM_STATUS.WITHHELD, label: 'Withhold Item', icon: Ban },
  ],
} as const

/**
 * Reusable item actions menu component that can be used as a context menu,
 * popover, or with a three-dots button trigger.
 */
export function ItemActions({ 
  item,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  isStatusChanging = false,
  changingToStatus,
  showAsPopover = false,
  showThreeDotsButton = false,
  disabled = false,
  children
}: ItemActionsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  
  const createMenuAction = (originalOnClick: () => void) => {
    return () => {
      setPopoverOpen(false)
      originalOnClick()
    }
  }

  const menuItems = [
    ...(onView ? [{
      label: 'View Details',
      icon: Eye,
      onClick: createMenuAction(() => onView(item)),
      destructive: false,
      disabled: Boolean(disabled || isStatusChanging),
      loading: false
    }] : []),
    ...(onEdit ? [{
      label: 'Edit Item',
      icon: Edit,
      onClick: createMenuAction(() => onEdit(item)),
      destructive: false,
      disabled: Boolean(disabled || isStatusChanging),
      loading: false
    }] : []),
    ...(onStatusChange ? (statusTransitions[item.status as keyof typeof statusTransitions] || []).map(({ status, label, icon }) => ({
      label,
      icon,
      onClick: createMenuAction(() => onStatusChange(item.id, status)),
      destructive: false,
      disabled: Boolean(disabled || isStatusChanging),
      loading: Boolean(isStatusChanging && changingToStatus === status)
    })) : []),
    ...(onDelete ? [{
      label: 'Delete Item',
      icon: Trash2,
      onClick: createMenuAction(() => onDelete(item)),
      destructive: true,
      disabled: Boolean(disabled || isStatusChanging),
      loading: false
    }] : [])
  ]

  // If no actions are available, don't render anything
  if (menuItems.length === 0) {
    return children ? <>{children}</> : null
  }

  const MenuContent = ({ asPopover = false }: { asPopover?: boolean }) => {
    if (asPopover) {
      return (
        <div className="min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {menuItems.map(({ label, icon: Icon, onClick, destructive, disabled, loading }) => (
            <div
              key={label}
              className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
              } ${destructive ? 'text-destructive focus:text-destructive' : ''}`}
              onClick={disabled ? undefined : onClick}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              <span>{label}</span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <>
        {menuItems.map(({ label, icon: Icon, onClick, destructive, disabled, loading }) => (
          <ContextMenuItem 
            key={label}
            onClick={disabled ? undefined : onClick}
            className={`${destructive ? "text-destructive focus:text-destructive" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={disabled}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icon className="mr-2 h-4 w-4" />
            )}
            <span>{label}</span>
          </ContextMenuItem>
        ))}
      </>
    )
  }

  // Three dots button with popover
  if (showThreeDotsButton) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted/50"
            disabled={disabled}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <MenuContent asPopover />
        </PopoverContent>
      </Popover>
    )
  }

  // Popover mode
  if (showAsPopover) {
    return <MenuContent asPopover />
  }

  // Context menu mode (default)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children || <div />}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <MenuContent />
      </ContextMenuContent>
    </ContextMenu>
  )
}
