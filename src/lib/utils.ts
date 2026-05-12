import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DB query API의 .or() 필터에 사용자 입력을 넣을 때 인젝션 방지
export function escapeFilterValue(value: string): string {
  return value.replace(/[%_\\,().]/g, (ch) => `\\${ch}`)
}
