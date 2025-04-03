import { Plus, Search, Layers, Shirt, Crown, X } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { Footprints } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { client, useItems, ItemsResponse } from '@/lib/client'
import { useAuth } from '@clerk/nextjs'

interface ItemInlineSearchProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  addMode?: boolean
  onNewItem?: (itemId: string, itemType: string) => void
}

const itemTypes = [
  { type: 'layer', icon: Layers, label: 'Layer' },
  { type: 'top', icon: Shirt, label: 'Top' },
  { type: 'bottom', icon: PiPantsFill, label: 'Bottom' },
  { type: 'footwear', icon: Footprints, label: 'Footwear' },
  { type: 'accessory', icon: Crown, label: 'Accessory' },
] as const

export function ItemInlineSearch({ 
  value, 
  onChange, 
  onClick, 
  onKeyDown, 
  addMode = false,
  onNewItem
}: ItemInlineSearchProps) {
  const { getToken } = useAuth()
  const { mutate: mutateItems } = useItems()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'name' | 'brand' | 'type'>('name')
  const [confirmedName, setConfirmedName] = useState('')
  const [confirmedBrand, setConfirmedBrand] = useState('')
  const [internalValue, setInternalValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInternalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    if (!addMode || stage === 'name') {
      onChange(e)
    }
  }

  const handleInternalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (addMode) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (stage === 'name' && internalValue.trim()) {
          setConfirmedName(internalValue.trim())
          setStage('brand')
          setInternalValue('')
        } else if (stage === 'brand') {
          setConfirmedBrand(internalValue.trim())
          setStage('type')
          setInternalValue('')
        }
      } else if (e.key === 'Backspace' && !internalValue) {
        e.preventDefault()
        if (stage === 'brand') {
          setStage('name')
          setInternalValue(confirmedName)
          setConfirmedName('')
          onChange({ target: { value: confirmedName } } as React.ChangeEvent<HTMLInputElement>)
        } else if (stage === 'type') {
          setStage('brand')
          setInternalValue(confirmedBrand)
          setConfirmedBrand('')
        }
      }
    } else {
      onKeyDown(e)
    }
  }

  const handleTypeSelect = async (type: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await client.api.items.$post({
        json: {
          name: confirmedName,
          ...(confirmedBrand ? { brand: confirmedBrand } : {}),
          type: type,
          rating: 2,
        }
      }, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        }
      })

      if (res.ok) {
        const newItem = await res.json()
        await mutateItems()
        onNewItem?.(newItem.id, newItem.type)
        setStage('name')
        setConfirmedName('')
        setConfirmedBrand('')
        setInternalValue('')
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (addMode && stage === 'type' && e.key === 'Backspace') {
      e.preventDefault()
      setStage('brand')
      setInternalValue(confirmedBrand)
      setConfirmedBrand('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [addMode, stage, confirmedBrand])

  useEffect(() => {
    if (stage === 'type') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [stage, handleKeyDown])

  const handleClearAll = () => {
    setStage('name')
    setConfirmedName('')
    setConfirmedBrand('')
    setInternalValue('')
    onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  }

  return (
    <div className="flex items-center space-x-3 min-w-0 max-w-full">
      <div className="flex-shrink-0 p-[4px] rounded bg-gray-300 text-white border-2 border-gray-300 mt-0.5">
        {addMode ? <Plus className="h-[17.5px] w-[17.5px]" /> : <Search className="h-[17.5px] w-[17.5px]" />}
      </div>
      <div className="flex-1 min-w-0">
        {stage === 'type' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Select type for <span className="font-medium">{confirmedName}</span>
                {confirmedBrand && <span> • {confirmedBrand}</span>}
              </p>
              <button
                onClick={handleClearAll}
                className="p-0.5 mr-2 hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {itemTypes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-start">
            {addMode && stage === 'brand' && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {confirmedName}
                </p>
                <button
                  onClick={handleClearAll}
                  className="p-0.5 mr-2 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={addMode ? internalValue : value}
              onChange={handleInternalChange}
              onClick={onClick}
              onKeyDown={handleInternalKeyDown}
              placeholder={stage === 'brand' ? "Enter brand (optional)..." : "Search items, brands, types..."}
              className="font-medium leading-[18px] bg-transparent focus:outline-none w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
