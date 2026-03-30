'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = '검색...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(internal), 300)
    return () => clearTimeout(timer)
  }, [internal, onChange])

  useEffect(() => {
    setInternal(value)
  }, [value])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9189]" />
      <Input
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-9 text-sm"
      />
    </div>
  )
}
