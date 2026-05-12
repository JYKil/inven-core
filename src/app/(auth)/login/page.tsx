'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn.email({
      email,
      password,
    })

    if (error) {
      setError(
        error.message === 'Invalid email or password'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message || '로그인에 실패했습니다.'
      )
      setLoading(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="font-heading text-xl font-semibold tracking-[-0.01em] text-foreground">
        로그인
      </h2>

      {error && (
        <div className="text-cell text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-cell text-foreground">
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
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-cell text-foreground">
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
            className="h-9 text-sm"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-9 bg-primary hover:bg-primary-hover text-white text-sm font-medium"
      >
        {loading ? '로그인 중...' : '로그인'}
      </Button>

      <p className="text-center text-cell text-text-secondary">
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
