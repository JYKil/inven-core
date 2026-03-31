'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'

interface CancelDialogProps {
  title: string
  description: string
  triggerLabel: string
  onConfirm: (reason: string) => Promise<void>
  isPending: boolean
  disabled?: boolean
}

export function CancelDialog({
  title,
  description,
  triggerLabel,
  onConfirm,
  isPending,
  disabled,
}: CancelDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const handleConfirm = async () => {
    await onConfirm(reason)
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive" disabled={disabled} />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            취소 사유 (선택)
          </label>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            rows={3}
            placeholder="취소 사유를 입력하세요"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            닫기
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? '처리 중...' : '취소 실행'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
