'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signUp.email({
      name: displayName,
      email,
      password,
    })

    if (error) {
      setError(error.message || '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register-pending', { method: 'POST' })
    if (!res.ok && res.status !== 409) {
      const data = await res.json()
      setError(data.error || '가입 처리에 실패했습니다')
      setLoading(false)
      return
    }

    const data = res.status === 409 ? { role: 'pending' } : await res.json()
    router.replace(data.role === 'super_admin' ? '/' : '/pending')
    router.refresh()
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <h2 className="font-heading text-xl font-semibold tracking-[-0.01em] text-foreground">
        회원가입
      </h2>

      {error && (
        <div className="text-cell text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-cell text-foreground">
            이름
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="홍길동"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
            className="h-9 text-sm"
          />
        </div>

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
            placeholder="6자 이상"
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
        {loading ? '가입 중...' : '회원가입'}
      </Button>

      <p className="text-center text-cell text-text-secondary">
        이미 계정이 있으신가요?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover font-medium"
        >
          로그인
        </Link>
      </p>
    </form>
  )
}
