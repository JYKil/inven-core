'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message
      )
      setLoading(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
        로그인
      </h2>

      {error && (
        <div className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] text-foreground">
            이메일
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="h-9 text-[14px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px] text-foreground">
            비밀번호
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-9 text-[14px]"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-9 bg-primary hover:bg-primary-hover text-white text-[14px] font-medium"
      >
        {loading ? '로그인 중...' : '로그인'}
      </Button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-[12px] text-muted-foreground">또는</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        }}
        className="w-full h-9 text-[14px] font-medium border-border text-foreground hover:bg-background"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google로 계속하기
      </Button>

      <p className="text-center text-[13px] text-text-secondary">
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          className="text-primary hover:text-primary-hover font-medium"
        >
          회원가입
        </Link>
      </p>
    </form>
  )
}
