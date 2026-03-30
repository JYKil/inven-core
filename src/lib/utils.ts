import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Supabase PostgREST 필터 특수문자 이스케이프
// .or() 필터에 사용자 입력을 넣을 때 인젝션 방지
export function escapeFilterValue(value: string): string {
  return value.replace(/[%_\\,().]/g, (ch) => `\\${ch}`)
}
