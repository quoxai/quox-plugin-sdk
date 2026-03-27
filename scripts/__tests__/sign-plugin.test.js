import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

// Extract the pure functions from sign-plugin.js for testing
// (canonicalSort and computeDigest)

function canonicalSort(obj) {
  if (Array.isArray(obj)) return obj.map(canonicalSort)
  if (obj !== null && typeof obj === 'object') {
    const sorted = {}
    for (const key of Object.keys(obj).sort()) {
      if (key === 'signature') continue
      sorted[key] = canonicalSort(obj[key])
    }
    return sorted
  }
  return obj
}

function computeDigest(manifest) {
  const canonical = canonicalSort(manifest)
  const json = JSON.stringify(canonical)
  return crypto.createHash('sha256').update(json).digest('base64')
}

describe('sign-plugin', () => {
  describe('canonicalSort', () => {
    it('sorts object keys alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 }
      const result = canonicalSort(input)
      expect(Object.keys(result)).toEqual(['a', 'm', 'z'])
    })

    it('sorts nested objects recursively', () => {
      const input = { z: { b: 1, a: 2 }, a: 3 }
      const result = canonicalSort(input)
      expect(Object.keys(result)).toEqual(['a', 'z'])
      expect(Object.keys(result.z)).toEqual(['a', 'b'])
    })

    it('strips the signature field', () => {
      const input = { name: 'test', signature: 'abc123', version: '1.0' }
      const result = canonicalSort(input)
      expect(result).not.toHaveProperty('signature')
      expect(result).toHaveProperty('name', 'test')
      expect(result).toHaveProperty('version', '1.0')
    })

    it('strips nested signature fields', () => {
      const input = { meta: { signature: 'nested', data: 'keep' } }
      const result = canonicalSort(input)
      expect(result.meta).not.toHaveProperty('signature')
      expect(result.meta).toHaveProperty('data', 'keep')
    })

    it('handles arrays without sorting them', () => {
      const input = { items: [3, 1, 2] }
      const result = canonicalSort(input)
      expect(result.items).toEqual([3, 1, 2])
    })

    it('handles arrays of objects', () => {
      const input = { items: [{ z: 1, a: 2 }, { b: 3, a: 4 }] }
      const result = canonicalSort(input)
      expect(Object.keys(result.items[0])).toEqual(['a', 'z'])
      expect(Object.keys(result.items[1])).toEqual(['a', 'b'])
    })

    it('passes through primitives', () => {
      expect(canonicalSort(42)).toBe(42)
      expect(canonicalSort('hello')).toBe('hello')
      expect(canonicalSort(true)).toBe(true)
      expect(canonicalSort(null)).toBe(null)
    })
  })

  describe('computeDigest', () => {
    it('produces a base64 SHA-256 hash', () => {
      const digest = computeDigest({ name: 'test', version: '1.0.0' })
      expect(typeof digest).toBe('string')
      // Base64 of SHA-256 is 44 chars
      expect(digest.length).toBe(44)
    })

    it('is deterministic for same input', () => {
      const manifest = { name: 'test', version: '1.0.0', id: 'test-plugin' }
      const d1 = computeDigest(manifest)
      const d2 = computeDigest(manifest)
      expect(d1).toBe(d2)
    })

    it('produces same digest regardless of key order', () => {
      const m1 = { name: 'test', version: '1.0.0' }
      const m2 = { version: '1.0.0', name: 'test' }
      expect(computeDigest(m1)).toBe(computeDigest(m2))
    })

    it('ignores signature field in digest computation', () => {
      const without = { name: 'test', version: '1.0.0' }
      const withSig = { name: 'test', version: '1.0.0', signature: 'abc' }
      expect(computeDigest(without)).toBe(computeDigest(withSig))
    })

    it('changes digest when content changes', () => {
      const d1 = computeDigest({ name: 'test', version: '1.0.0' })
      const d2 = computeDigest({ name: 'test', version: '2.0.0' })
      expect(d1).not.toBe(d2)
    })
  })

  describe('Ed25519 signing flow', () => {
    it('signs and verifies a digest end-to-end', () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
      const manifest = { id: 'test-plugin', name: 'Test', version: '1.0.0' }
      const digest = computeDigest(manifest)
      const digestBytes = Buffer.from(digest, 'base64')

      // Sign
      const signature = crypto.sign(null, digestBytes, privateKey)
      expect(signature).toBeInstanceOf(Buffer)
      expect(signature.length).toBe(64) // Ed25519 signatures are 64 bytes

      // Verify
      const isValid = crypto.verify(null, digestBytes, publicKey, signature)
      expect(isValid).toBe(true)
    })

    it('rejects signatures from wrong key', () => {
      const kp1 = crypto.generateKeyPairSync('ed25519')
      const kp2 = crypto.generateKeyPairSync('ed25519')
      const manifest = { id: 'test-plugin', name: 'Test', version: '1.0.0' }
      const digest = computeDigest(manifest)
      const digestBytes = Buffer.from(digest, 'base64')

      const signature = crypto.sign(null, digestBytes, kp1.privateKey)
      const isValid = crypto.verify(null, digestBytes, kp2.publicKey, signature)
      expect(isValid).toBe(false)
    })

    it('rejects signatures for tampered manifests', () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
      const manifest = { id: 'test-plugin', name: 'Test', version: '1.0.0' }
      const digest = computeDigest(manifest)
      const digestBytes = Buffer.from(digest, 'base64')

      const signature = crypto.sign(null, digestBytes, privateKey)

      // Tamper with manifest
      const tampered = { ...manifest, version: '9.9.9' }
      const tamperedDigest = computeDigest(tampered)
      const tamperedBytes = Buffer.from(tamperedDigest, 'base64')

      const isValid = crypto.verify(null, tamperedBytes, publicKey, signature)
      expect(isValid).toBe(false)
    })
  })
})
