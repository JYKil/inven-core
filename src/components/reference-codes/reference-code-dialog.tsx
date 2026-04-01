'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronsUpDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import {
  referenceCodeCreateSchema,
  type ReferenceCodeCreate,
  type ReferenceCodeUpdate,
} from '@/lib/validations/reference-code'
import type { Database } from '@/types/database'

type ReferenceCode = Database['public']['Tables']['reference_codes']['Row']

interface ReferenceCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: ReferenceCode | null
  existingTypes: string[]
  onSubmit: (data: ReferenceCodeCreate | ReferenceCodeUpdate) => Promise<void>
  isPending: boolean
}

export function ReferenceCodeDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  existingTypes,
  onSubmit,
  isPending,
}: ReferenceCodeDialogProps) {
  const [typeOpen, setTypeOpen] = useState(false)

  // 항상 createSchema 사용 — 수정 모드에서는 code_type을 UI에서만 읽기전용 처리
  const form = useForm<ReferenceCodeCreate>({
    resolver: zodResolver(referenceCodeCreateSchema),
    defaultValues: {
      code_type: '',
      code_data1: '',
      code_data2: '',
      code_data3: '',
      code_data4: '',
      code_data5: '',
      code_data6: '',
      code_data7: '',
      code_data8: '',
      code_data9: '',
    },
  })

  // 수정 모드일 때 초기값 설정
  useEffect(() => {
    if (open && initialData && mode === 'edit') {
      form.reset({
        code_type: initialData.code_type,
        code_data1: initialData.code_data1,
        code_data2: initialData.code_data2 ?? '',
        code_data3: initialData.code_data3 ?? '',
        code_data4: initialData.code_data4 ?? '',
        code_data5: initialData.code_data5 ?? '',
        code_data6: initialData.code_data6 ?? '',
        code_data7: initialData.code_data7 ?? '',
        code_data8: initialData.code_data8 ?? '',
        code_data9: initialData.code_data9 ?? '',
      })
    } else if (open && mode === 'create') {
      form.reset({
        code_type: '',
        code_data1: '',
        code_data2: '',
        code_data3: '',
        code_data4: '',
        code_data5: '',
        code_data6: '',
        code_data7: '',
        code_data8: '',
        code_data9: '',
      })
    }
  }, [open, initialData, mode, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    // 빈 문자열 → undefined 변환 (optional 필드)
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as ReferenceCodeCreate
    await onSubmit(cleaned)
    onOpenChange(false)
  })

  const selectedType = form.watch('code_type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '기준정보 추가' : '기준정보 수정'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? '새로운 기준정보를 등록합니다.' : '기준정보를 수정합니다.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 타입 — Combobox */}
          <div className="space-y-1.5">
            <Label htmlFor="code_type">타입</Label>
            {mode === 'edit' ? (
              <Input
                id="code_type"
                value={initialData?.code_type ?? ''}
                disabled
                className="bg-muted"
              />
            ) : (
              <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={typeOpen}
                      className="w-full justify-between font-normal"
                    />
                  }
                >
                  {selectedType || '타입 선택 또는 입력...'}
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--anchor-width)] p-0">
                  <Command>
                    <CommandInput
                      placeholder="타입 검색 또는 새 타입 입력..."
                      onValueChange={(v) => {
                        // 자유 입력 허용 — 검색어를 code_type으로도 설정
                        form.setValue('code_type', v, { shouldValidate: true })
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {selectedType ? (
                          <span className="text-muted-foreground">
                            &quot;{selectedType}&quot; — 새 타입으로 등록됩니다
                          </span>
                        ) : (
                          '타입을 입력해주세요'
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {existingTypes.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(v) => {
                              form.setValue('code_type', v, { shouldValidate: true })
                              setTypeOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedType === type ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {form.formState.errors.code_type && (
              <p className="text-xs text-destructive">{form.formState.errors.code_type.message}</p>
            )}
          </div>

          {/* 데이터 필드 1~9 */}
          {Array.from({ length: 9 }, (_, i) => {
            const fieldName = `code_data${i + 1}` as keyof ReferenceCodeCreate
            const isRequired = i === 0
            return (
              <div key={fieldName} className="space-y-1.5">
                <Label htmlFor={fieldName}>
                  데이터 {i + 1}
                  {isRequired && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <Input
                  id={fieldName}
                  {...form.register(fieldName)}
                  placeholder={`보조 데이터 ${i + 1}`}
                />
                {form.formState.errors[fieldName] && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors[fieldName]?.message}
                  </p>
                )}
              </div>
            )
          })}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : mode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
