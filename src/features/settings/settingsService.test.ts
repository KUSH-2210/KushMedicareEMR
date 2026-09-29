import { describe, expect, it } from 'vitest'
import { validatePrivateImage } from './settingsService'

describe('private prescription assets', () => {
  it('accepts supported images and rejects unsafe file types or oversized files', () => {
    expect(validatePrivateImage(new File(['image'], 'signature.png', { type: 'image/png' }))).toBeNull()
    expect(validatePrivateImage(new File(['text'], 'signature.svg', { type: 'image/svg+xml' }))).toContain('PNG')
    expect(validatePrivateImage({ type: 'image/webp', size: 2 * 1024 * 1024 + 1 } as File)).toContain('2 MB')
  })
})
