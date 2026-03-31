import { describe, it, expect } from 'vitest'
import { escapeFilterValue } from '@/lib/utils'

describe('escapeFilterValue', () => {
  it('특수문자 없는 문자열은 그대로 반환', () => {
    expect(escapeFilterValue('hello')).toBe('hello')
  })

  it('% 이스케이프', () => {
    expect(escapeFilterValue('100%')).toBe('100\\%')
  })

  it('_ 이스케이프', () => {
    expect(escapeFilterValue('test_value')).toBe('test\\_value')
  })

  it('\\ 이스케이프', () => {
    expect(escapeFilterValue('path\\to')).toBe('path\\\\to')
  })

  it(', 이스케이프', () => {
    expect(escapeFilterValue('a,b')).toBe('a\\,b')
  })

  it('() 이스케이프', () => {
    expect(escapeFilterValue('fn(x)')).toBe('fn\\(x\\)')
  })

  it('. 이스케이프', () => {
    expect(escapeFilterValue('v1.2')).toBe('v1\\.2')
  })

  it('여러 특수문자 동시 이스케이프', () => {
    expect(escapeFilterValue('a%b_c.d')).toBe('a\\%b\\_c\\.d')
  })

  it('빈 문자열은 그대로 반환', () => {
    expect(escapeFilterValue('')).toBe('')
  })
})
