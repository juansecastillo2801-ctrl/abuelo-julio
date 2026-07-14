'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface MultiSelectDropdownProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  /** Shown when all are selected. Also used as the "select all" label. */
  placeholder: string
  /** Used in the count label, e.g. "empleados" → "3 empleados" */
  countLabel?: string
  searchable?: boolean
  className?: string
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  countLabel = 'seleccionados',
  searchable = false,
  className,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectAllRef = useRef<HTMLInputElement>(null)

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) setSearch('')
    setOpen(isOpen)
  }

  const visibleOptions = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const allSelected = selected.length === options.length
  const someSelected = selected.length > 0 && selected.length < options.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  function toggleAll() {
    if (allSelected) {
      onChange([])
    } else {
      onChange(options.map(o => o.value))
    }
  }

  function toggleOption(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  function getLabel() {
    // [] means "no filter" coming from the table — treat same as all selected
    if (selected.length === 0 || selected.length === options.length) return placeholder
    if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? placeholder
    return `${selected.length} ${countLabel}`
  }

  const isFiltered = selected.length > 0 && selected.length < options.length

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'h-8 gap-1.5 text-sm font-normal',
              isFiltered && 'border-primary text-primary',
              className
            )}
          />
        }
      >
        <span className="truncate max-w-[160px]">{getLabel()}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        {searchable && (
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 text-sm"
            />
          </div>
        )}

        <div className="max-h-56 overflow-y-auto">
          {/* Select all row */}
          <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 cursor-pointer border-b border-border">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
            />
            <span className="text-sm font-medium">{placeholder}</span>
          </label>

          {visibleOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/60 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
              />
              <span className="text-sm truncate">{option.label}</span>
            </label>
          ))}

          {visibleOptions.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              Sin resultados.
            </p>
          )}
        </div>

      </PopoverContent>
    </Popover>
  )
}
