'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1분
        gcTime: 10 * 60 * 1000, // 10분 (가비지 컬렉션)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true, // 네트워크 재연결 시 갱신
        retry: 1, // 실패 시 1회 재시도
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      },
      mutations: {
        retry: 0, // mutation은 재시도 안 함 (side effect 중복 방지)
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
