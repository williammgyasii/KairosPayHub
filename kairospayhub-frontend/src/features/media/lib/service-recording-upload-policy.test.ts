import { validateServiceRecordingFile } from '@/features/media/lib/service-recording-upload-policy'

describe('service-recording-upload-policy', () => {
  it('accepts mp4 within size limit', () => {
    const file = new File(['x'], 'service.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 1024 })
    expect(validateServiceRecordingFile(file)).toBeNull()
  })

  it('rejects unsupported types', () => {
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' })
    expect(validateServiceRecordingFile(file)).toMatch(/MP4/)
  })

  it('accepts files up to 6 GB', () => {
    const file = new File(['x'], 'service.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 * 1024 })
    expect(validateServiceRecordingFile(file)).toBeNull()
  })

  it('rejects files over 6 GB', () => {
    const file = new File(['x'], 'service.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 * 1024 + 1 })
    expect(validateServiceRecordingFile(file)).toMatch(/6\.0 GB.*6 GB or smaller/)
  })
})
