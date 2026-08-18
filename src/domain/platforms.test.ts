import { describe, expect, it } from 'vitest'
import { detectPlatformSlug } from './platforms'

describe('detectPlatformSlug', () => {
  it('detects the real sample IDs', () => {
    expect(detectPlatformSlug('403-2345345-5105954')).toBe('amazon')
    expect(detectPlatformSlug('OD333563261719682100')).toBe('flipkart')
    expect(detectPlatformSlug('127760831760899584')).toBe('meesho')
    // Myntra sample as pasted (stray space) and cleaned:
    expect(detectPlatformSlug('1320891 15422902139801')).toBe('myntra')
    expect(detectPlatformSlug('132089115422902139801')).toBe('myntra')
  })

  it('trims surrounding whitespace and is case-insensitive for Flipkart', () => {
    expect(detectPlatformSlug('  403-2345345-5105954  ')).toBe('amazon')
    expect(detectPlatformSlug('od333563261719682100')).toBe('flipkart')
  })

  it('returns null for empty or unrecognisable input', () => {
    expect(detectPlatformSlug('')).toBeNull()
    expect(detectPlatformSlug('   ')).toBeNull()
    expect(detectPlatformSlug('hello-world')).toBeNull()
    expect(detectPlatformSlug('12345')).toBeNull() // too short to be confident
  })
})
